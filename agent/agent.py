#!/usr/bin/env python3
"""
ModulaERP Monitoring Agent
Sends system metrics to the ModulaERP API every N seconds.
Config: config.ini
"""

import configparser
import hashlib
import os
import platform
import socket
import sys
import time
import uuid

try:
    import psutil
    import requests
except ImportError:
    print("Installing dependencies...")
    os.system(f"{sys.executable} -m pip install psutil requests")
    import psutil
    import requests

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.ini')

def load_config():
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_FILE)
    return cfg

def get_agent_key():
    # Stable ID based on MAC + hostname
    mac = ':'.join(['{:02x}'.format((uuid.getnode() >> i) & 0xff) for i in range(0, 48, 8)][::-1])
    raw = f"{mac}-{socket.gethostname()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:24]

def get_serial_number():
    system = platform.system()
    try:
        if system == 'Windows':
            import subprocess
            result = subprocess.run(['wmic', 'bios', 'get', 'serialnumber'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                line = line.strip()
                if line and line.lower() not in ('serialnumber', ''):
                    return line
        elif system == 'Linux':
            with open('/sys/class/dmi/id/product_serial') as f:
                return f.read().strip()
        elif system == 'Darwin':
            import subprocess
            result = subprocess.run(['system_profiler', 'SPHardwareDataType'], capture_output=True, text=True)
            for line in result.stdout.splitlines():
                if 'Serial Number' in line:
                    return line.split(':')[-1].strip()
    except Exception:
        pass
    return None

def collect_metrics():
    cpu   = psutil.cpu_percent(interval=1)
    mem   = psutil.virtual_memory()
    disk  = psutil.disk_usage('/')
    boot  = psutil.boot_time()
    uptime = int(time.time() - boot)

    return {
        'agent_key':      get_agent_key(),
        'hostname':       socket.gethostname(),
        'ip_address':     socket.gethostbyname(socket.gethostname()),
        'os_info':        f"{platform.system()} {platform.release()}",
        'processor':      platform.processor() or platform.machine(),
        'cpu_usage':      cpu,
        'ram_usage':      mem.percent,
        'disk_usage':     disk.percent,
        'uptime_seconds': uptime,
        'serial_number':  get_serial_number(),
    }

def send_heartbeat(api_url: str, token: str):
    data = collect_metrics()
    try:
        r = requests.post(
            api_url,
            json=data,
            headers={'X-Agent-Token': token, 'Content-Type': 'application/json'},
            timeout=10,
        )
        status = r.json().get('status', 'unknown')
        print(f"[{time.strftime('%H:%M:%S')}] Heartbeat sent — {data['hostname']} | CPU: {data['cpu_usage']:.1f}% | RAM: {data['ram_usage']:.1f}% | Status: {status}")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ERROR: {e}")

def main():
    cfg = load_config()
    api_url  = cfg.get('api', 'url',      fallback='http://localhost:4000/api/monitoring/heartbeat')
    token    = cfg.get('api', 'token',    fallback='')
    interval = cfg.getint('agent', 'interval_seconds', fallback=120)

    if not token:
        print("ERROR: Token not configured in config.ini")
        sys.exit(1)

    print(f"ModulaERP Agent started | Agent: {get_agent_key()} | Interval: {interval}s")
    while True:
        send_heartbeat(api_url, token)
        time.sleep(interval)

if __name__ == '__main__':
    main()

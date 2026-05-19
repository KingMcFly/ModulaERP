-- ============================================================
--  ModulaERP Database Schema
--  Generic multi-tenant ERP / SaaS platform
-- ============================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE DATABASE IF NOT EXISTS modulaerp_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE modulaerp_db;

-- ============================================================
--  SAAS PLATFORM LAYER
-- ============================================================

CREATE TABLE modules (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(7)  DEFAULT '#6366F1',
  is_active   BOOLEAN     DEFAULT TRUE,
  sort_order  INT         DEFAULT 0
);

CREATE TABLE tenants (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  name           VARCHAR(100) NOT NULL,
  slug           VARCHAR(50)  UNIQUE NOT NULL,
  logo_url       VARCHAR(255),
  primary_color  VARCHAR(7)   DEFAULT '#6366F1',
  status         ENUM('trial','active','suspended','cancelled') DEFAULT 'trial',
  plan           ENUM('starter','professional','enterprise')    DEFAULT 'starter',
  contact_email  VARCHAR(100),
  contact_phone  VARCHAR(30),
  country        VARCHAR(50),
  timezone       VARCHAR(50)  DEFAULT 'UTC',
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE tenant_modules (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id   INT  NOT NULL,
  module_id   INT  NOT NULL,
  is_active   BOOLEAN   DEFAULT TRUE,
  config      JSON,
  enabled_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id),
  UNIQUE KEY uq_tenant_module (tenant_id, module_id)
);

CREATE TABLE users (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT          NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  role         ENUM('super_admin','admin','manager','operator','viewer') DEFAULT 'operator',
  is_active    BOOLEAN      DEFAULT TRUE,
  last_login   TIMESTAMP    NULL,
  avatar_url   VARCHAR(255),
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ============================================================
--  MODULE: INVENTORY
-- ============================================================

CREATE TABLE locations (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT          NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  pos_x        FLOAT        DEFAULT 0,
  pos_y        FLOAT        DEFAULT 0,
  width        FLOAT        DEFAULT 100,
  height       FLOAT        DEFAULT 100,
  floor_level  INT          DEFAULT 1,
  color        VARCHAR(7)   DEFAULT '#94A3B8',
  criticality  ENUM('low','medium','high') DEFAULT 'low',
  shape        ENUM('rect','circle')       DEFAULT 'rect',
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE assets (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT          NOT NULL,
  serial_number     VARCHAR(100),
  barcode           VARCHAR(100),
  asset_type        VARCHAR(50)  NOT NULL,
  brand             VARCHAR(100),
  model             VARCHAR(100),
  value             DECIMAL(12,2),
  status            ENUM('available','loaned','maintenance','retired') DEFAULT 'available',
  location_id       INT,
  purchase_date     DATE,
  last_maintenance  DATE,
  notes             TEXT,
  is_active         BOOLEAN      DEFAULT TRUE,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE supplies (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id      INT          NOT NULL,
  name           VARCHAR(100) NOT NULL,
  category       VARCHAR(50),
  unit           VARCHAR(20),
  current_stock  INT          DEFAULT 0,
  min_stock      INT          DEFAULT 0,
  location_id    INT,
  unit_cost      DECIMAL(12,2),
  notes          TEXT,
  is_active      BOOLEAN      DEFAULT TRUE,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE supply_movements (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  supply_id   INT  NOT NULL,
  user_id     INT  NOT NULL,
  move_type   ENUM('in','out','adjustment') NOT NULL,
  quantity    INT  NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

-- ============================================================
--  MODULE: PERSONNEL
-- ============================================================

CREATE TABLE personnel (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT          NOT NULL,
  name         VARCHAR(100) NOT NULL,
  national_id  VARCHAR(30),
  department   VARCHAR(100),
  position     VARCHAR(100),
  shift        VARCHAR(50),
  phone        VARCHAR(30),
  email        VARCHAR(100),
  is_active    BOOLEAN      DEFAULT TRUE,
  hired_at     DATE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE technicians (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT          NOT NULL,
  personnel_id  INT,
  name          VARCHAR(100) NOT NULL,
  specialty     VARCHAR(100),
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (personnel_id) REFERENCES personnel(id) ON DELETE SET NULL
);

-- ============================================================
--  MODULE: LOANS
-- ============================================================

CREATE TABLE loans (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id        INT          NOT NULL,
  asset_id         INT          NOT NULL,
  borrower_id      INT,
  borrower_name    VARCHAR(100),
  issued_by        INT,
  issued_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  expected_return  DATE,
  actual_return    TIMESTAMP    NULL,
  returned_by      INT,
  status           ENUM('active','returned','overdue') DEFAULT 'active',
  notes            TEXT,
  signature_data   TEXT,
  pdf_path         VARCHAR(255),
  created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (asset_id)    REFERENCES assets(id),
  FOREIGN KEY (borrower_id) REFERENCES personnel(id) ON DELETE SET NULL,
  FOREIGN KEY (issued_by)   REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (returned_by) REFERENCES users(id)     ON DELETE SET NULL
);

-- ============================================================
--  MODULE: MAINTENANCE
-- ============================================================

CREATE TABLE maintenance_records (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id         INT          NOT NULL,
  asset_id          INT          NOT NULL,
  technician_id     INT,
  maint_type        ENUM('preventive','corrective','emergency') DEFAULT 'preventive',
  status            ENUM('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  scheduled_at      DATE,
  started_at        TIMESTAMP    NULL,
  completed_at      TIMESTAMP    NULL,
  description       TEXT,
  findings          TEXT,
  actions_taken     TEXT,
  cost              DECIMAL(12,2),
  next_maintenance  DATE,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)     REFERENCES tenants(id)     ON DELETE CASCADE,
  FOREIGN KEY (asset_id)      REFERENCES assets(id),
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_checklist (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  maintenance_id  INT          NOT NULL,
  description     VARCHAR(255) NOT NULL,
  is_completed    BOOLEAN      DEFAULT FALSE,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_records(id) ON DELETE CASCADE
);

CREATE TABLE maintenance_photos (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  maintenance_id  INT          NOT NULL,
  file_path       VARCHAR(255) NOT NULL,
  caption         VARCHAR(255),
  uploaded_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_records(id) ON DELETE CASCADE
);

-- ============================================================
--  MODULE: MONITORING
-- ============================================================

CREATE TABLE monitoring_tokens (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT          NOT NULL,
  token        VARCHAR(255) UNIQUE NOT NULL,
  label        VARCHAR(100),
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE monitoring_agents (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  asset_id        INT,
  agent_key       VARCHAR(100) UNIQUE NOT NULL,
  hostname        VARCHAR(100),
  ip_address      VARCHAR(45),
  os_info         VARCHAR(255),
  processor       VARCHAR(255),
  last_heartbeat  TIMESTAMP    NULL,
  cpu_usage       FLOAT        DEFAULT 0,
  ram_usage       FLOAT        DEFAULT 0,
  disk_usage      FLOAT        DEFAULT 0,
  uptime_seconds  BIGINT       DEFAULT 0,
  agent_status    ENUM('online','offline','warning') DEFAULT 'offline',
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id)  REFERENCES assets(id)  ON DELETE SET NULL
);

CREATE TABLE monitoring_heartbeats (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  agent_id     INT   NOT NULL,
  cpu_usage    FLOAT,
  ram_usage    FLOAT,
  disk_usage   FLOAT,
  recorded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES monitoring_agents(id) ON DELETE CASCADE
);

-- Auto-purge heartbeats older than 30 days (run via cron or event)
-- DELETE FROM monitoring_heartbeats WHERE recorded_at < NOW() - INTERVAL 30 DAY;

-- ============================================================
--  SHARED: ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_logs (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT         NOT NULL,
  user_id      INT,
  module       VARCHAR(50) NOT NULL,
  action       VARCHAR(50) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    INT,
  details      JSON,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);

-- ============================================================
--  TRIGGERS: keep asset status in sync
-- ============================================================

DELIMITER $$

CREATE TRIGGER after_loan_insert
AFTER INSERT ON loans FOR EACH ROW
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE assets SET status = 'loaned' WHERE id = NEW.asset_id;
  END IF;
END$$

CREATE TRIGGER after_loan_update
AFTER UPDATE ON loans FOR EACH ROW
BEGIN
  IF NEW.status = 'returned' THEN
    UPDATE assets SET status = 'available'
    WHERE id = NEW.asset_id
      AND status = 'loaned';
  END IF;
END$$

CREATE TRIGGER after_maintenance_insert
AFTER INSERT ON maintenance_records FOR EACH ROW
BEGIN
  IF NEW.status = 'in_progress' THEN
    UPDATE assets SET status = 'maintenance' WHERE id = NEW.asset_id;
  END IF;
END$$

CREATE TRIGGER after_maintenance_update
AFTER UPDATE ON maintenance_records FOR EACH ROW
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
    UPDATE assets SET status = 'available',
                      last_maintenance = CURDATE()
    WHERE id = NEW.asset_id
      AND status = 'maintenance';
  END IF;
END$$

DELIMITER ;

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO modules (code, name, description, icon, color, sort_order) VALUES
('inventory',   'Inventario',         'Gestión de activos, equipos y ubicaciones',      'Package',          '#6366F1', 1),
('loans',       'Préstamos',          'Control de préstamo y devolución de equipos',    'ArrowRightLeft',   '#0EA5E9', 2),
('maintenance', 'Mantenimientos',     'Programación y seguimiento de mantenimientos',   'Wrench',           '#F59E0B', 3),
('personnel',   'Gestión de Personal','Administración de empleados y departamentos',    'Users',            '#10B981', 4),
('monitoring',  'Monitoreo',          'Monitoreo en tiempo real de equipos con agente', 'Activity',         '#EF4444', 5);

-- Super admin tenant
INSERT INTO tenants (name, slug, status, plan, contact_email) VALUES
('ModulaERP Admin', 'admin', 'active', 'enterprise', 'admin@modulaerp.com');

-- Super admin user  (password: admin123 — change immediately)
-- bcrypt hash of 'admin123'
INSERT INTO users (tenant_id, email, password, name, role) VALUES
(1, 'admin@modulaerp.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWq', 'Super Admin', 'super_admin');

-- Enable all modules for admin tenant
INSERT INTO tenant_modules (tenant_id, module_id) SELECT 1, id FROM modules;

# ModulaERP

Plataforma SaaS/ERP modular y genérica. Cada empresa (tenant) activa solo los módulos que necesita.

## Estructura

```
ModulaERP/
├── database/       # Schema SQL genérico (modulaerp_db)
├── backend/        # API Node.js + Express (puerto 4000)
├── admin/          # Panel super-admin SaaS (puerto 5174)
├── app/            # Aplicación principal clientes (puerto 5173)
└── agent/          # Agente Python de monitoreo
```

## Módulos disponibles

| Código        | Módulo              | Descripción                                         |
|---------------|---------------------|-----------------------------------------------------|
| `inventory`   | Inventario          | Gestión de activos, equipos, ubicaciones e insumos  |
| `loans`       | Préstamos           | Control de préstamo y devolución de equipos         |
| `maintenance` | Mantenimientos      | Programación y seguimiento de mantenimientos        |
| `personnel`   | Gestión de Personal | Administración de empleados y departamentos         |
| `monitoring`  | Monitoreo           | Monitoreo en tiempo real con agente Python          |

## Inicio rápido

### 1. Base de datos
```sql
mysql -u root -p < database/schema.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env   # edita credenciales
npm install
npm run dev            # http://localhost:4000
```

### 3. Panel Admin (Super Admin)
```bash
cd admin
npm install
npm run dev            # http://localhost:5174
# Login: admin@modulaerp.com / admin123
```

### 4. App Principal (Clientes)
```bash
cd app
npm install
npm run dev            # http://localhost:5173
```

### 5. Agente de Monitoreo
```bash
cd agent
cp config.ini.example config.ini   # edita URL y token
python agent.py
```

## Flujo SaaS (Admin)

1. **Admin crea empresa** → nombre, slug, plan, módulos
2. **Admin crea usuarios** → asigna rol y credenciales
3. **Cliente inicia sesión** → ve solo sus módulos habilitados
4. **Admin puede activar/desactivar módulos** en cualquier momento

## Credenciales por defecto
- Super Admin: `admin@modulaerp.com` / `admin123`
- **Cambia la contraseña inmediatamente en producción**

## Stack tecnológico
- **Frontend**: React 19 + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + MySQL2
- **Base de datos**: MySQL 8 / MariaDB 10.6+
- **Agente**: Python 3 + psutil

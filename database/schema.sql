-- ============================================================
--  ModulaERP Database Schema — PostgreSQL
--  Generic multi-tenant ERP / SaaS platform
-- ============================================================

-- ============================================================
--  SAAS PLATFORM LAYER
-- ============================================================

CREATE TABLE modules (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  icon        VARCHAR(50),
  color       VARCHAR(7)  DEFAULT '#6366F1',
  is_active   BOOLEAN     DEFAULT TRUE,
  sort_order  INT         DEFAULT 0
);

CREATE TABLE tenants (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  slug           VARCHAR(50)  UNIQUE NOT NULL,
  logo_url       VARCHAR(255),
  primary_color  VARCHAR(7)   DEFAULT '#6366F1',
  status         VARCHAR(30)  DEFAULT 'trial'    CHECK (status IN ('trial','active','suspended','cancelled')),
  plan           VARCHAR(30)  DEFAULT 'starter'  CHECK (plan IN ('starter','professional','enterprise')),
  contact_email  VARCHAR(100),
  contact_phone  VARCHAR(30),
  country        VARCHAR(50),
  timezone       VARCHAR(50)  DEFAULT 'UTC',
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_modules (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT  NOT NULL,
  module_id   INT  NOT NULL,
  is_active   BOOLEAN   DEFAULT TRUE,
  config      JSONB,
  enabled_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  disabled_at TIMESTAMP NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (module_id) REFERENCES modules(id),
  UNIQUE (tenant_id, module_id)
);

CREATE TABLE users (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT          NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  role         VARCHAR(30)  DEFAULT 'operator' CHECK (role IN ('super_admin','admin','manager','operator','viewer','user')),
  rut          VARCHAR(20),
  user_id      INT,
  is_active    BOOLEAN      DEFAULT TRUE,
  last_login   TIMESTAMP    NULL,
  avatar_url   VARCHAR(255),
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE user_module_permissions (
  id          SERIAL PRIMARY KEY,
  user_id     INT     NOT NULL,
  tenant_id   INT     NOT NULL,
  module_code VARCHAR(50) NOT NULL,
  can_view    BOOLEAN DEFAULT FALSE,
  can_write   BOOLEAN DEFAULT FALSE,
  can_delete  BOOLEAN DEFAULT FALSE,
  UNIQUE (user_id, tenant_id, module_code),
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL,
  token      VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMP    NOT NULL,
  used_at    TIMESTAMP    NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE plan_limits (
  id        SERIAL PRIMARY KEY,
  plan      VARCHAR(30) NOT NULL,
  resource  VARCHAR(50) NOT NULL,
  max_value INT         NOT NULL DEFAULT -1,
  UNIQUE (plan, resource)
);

-- ============================================================
--  MODULE: INVENTORY
-- ============================================================

CREATE TABLE locations (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT          NOT NULL,
  name         VARCHAR(100) NOT NULL,
  description  TEXT,
  pos_x        FLOAT        DEFAULT 0,
  pos_y        FLOAT        DEFAULT 0,
  width        FLOAT        DEFAULT 100,
  height       FLOAT        DEFAULT 100,
  floor_level  INT          DEFAULT 1,
  color        VARCHAR(7)   DEFAULT '#94A3B8',
  criticality  VARCHAR(30)  DEFAULT 'low'  CHECK (criticality IN ('low','medium','high')),
  shape        VARCHAR(30)  DEFAULT 'rect' CHECK (shape IN ('rect','circle')),
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE assets (
  id                SERIAL PRIMARY KEY,
  tenant_id         INT          NOT NULL,
  serial_number     VARCHAR(100),
  barcode           VARCHAR(100),
  asset_type        VARCHAR(50)  NOT NULL,
  brand             VARCHAR(100),
  model             VARCHAR(100),
  value             DECIMAL(12,2),
  status            VARCHAR(30)  DEFAULT 'available' CHECK (status IN ('available','loaned','maintenance','retired')),
  location_id       INT,
  purchase_date     DATE,
  last_maintenance  DATE,
  notes             TEXT,
  is_active         BOOLEAN      DEFAULT TRUE,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE asset_types (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE departments (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE shifts (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE supply_categories (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  is_active  BOOLEAN      DEFAULT TRUE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE supplies (
  id             SERIAL PRIMARY KEY,
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
  updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

CREATE TABLE supply_movements (
  id          SERIAL PRIMARY KEY,
  supply_id   INT  NOT NULL,
  user_id     INT  NOT NULL,
  move_type   VARCHAR(30) NOT NULL CHECK (move_type IN ('in','out','adjustment')),
  quantity    INT  NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)
);

CREATE TABLE attachments (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT          NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   INT          NOT NULL,
  file_path   VARCHAR(255) NOT NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_size   INT,
  mime_type   VARCHAR(100),
  uploaded_by INT,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL
);

-- ============================================================
--  MODULE: PERSONNEL
-- ============================================================

CREATE TABLE personnel (
  id           SERIAL PRIMARY KEY,
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
  user_id      INT,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);

CREATE TABLE technicians (
  id            SERIAL PRIMARY KEY,
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
  id               SERIAL PRIMARY KEY,
  tenant_id        INT          NOT NULL,
  asset_id         INT          NOT NULL,
  borrower_id      INT,
  borrower_name    VARCHAR(100),
  issued_by        INT,
  issued_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  expected_return  DATE,
  actual_return    TIMESTAMP    NULL,
  returned_by      INT,
  status           VARCHAR(30)  DEFAULT 'active' CHECK (status IN ('active','returned','overdue')),
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
  id                SERIAL PRIMARY KEY,
  tenant_id         INT          NOT NULL,
  asset_id          INT          NOT NULL,
  technician_id     INT,
  maint_type        VARCHAR(30)  DEFAULT 'preventive' CHECK (maint_type IN ('preventive','corrective','emergency')),
  status            VARCHAR(30)  DEFAULT 'pending'    CHECK (status IN ('pending','in_progress','completed','cancelled')),
  scheduled_at      DATE,
  started_at        TIMESTAMP    NULL,
  completed_at      TIMESTAMP    NULL,
  description       TEXT,
  findings          TEXT,
  actions_taken     TEXT,
  cost              DECIMAL(12,2),
  next_maintenance  DATE,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)     REFERENCES tenants(id)     ON DELETE CASCADE,
  FOREIGN KEY (asset_id)      REFERENCES assets(id),
  FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE SET NULL
);

CREATE TABLE maintenance_checklist (
  id              SERIAL PRIMARY KEY,
  maintenance_id  INT          NOT NULL,
  description     VARCHAR(255) NOT NULL,
  is_completed    BOOLEAN      DEFAULT FALSE,
  FOREIGN KEY (maintenance_id) REFERENCES maintenance_records(id) ON DELETE CASCADE
);

CREATE TABLE maintenance_photos (
  id              SERIAL PRIMARY KEY,
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
  id           SERIAL PRIMARY KEY,
  tenant_id    INT          NOT NULL,
  token        VARCHAR(255) UNIQUE NOT NULL,
  label        VARCHAR(100),
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE monitoring_agents (
  id              SERIAL PRIMARY KEY,
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
  agent_status    VARCHAR(30)  DEFAULT 'offline' CHECK (agent_status IN ('online','offline','warning')),
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id)  REFERENCES assets(id)  ON DELETE SET NULL
);

CREATE TABLE monitoring_heartbeats (
  id           SERIAL PRIMARY KEY,
  agent_id     INT   NOT NULL,
  cpu_usage    FLOAT,
  ram_usage    FLOAT,
  disk_usage   FLOAT,
  recorded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES monitoring_agents(id) ON DELETE CASCADE
);

-- ============================================================
--  MODULE: PROVIDERS / CONTRACTS / COST CENTERS / PURCHASES
-- ============================================================

CREATE TABLE providers (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT          NOT NULL,
  name         VARCHAR(100) NOT NULL,
  rut          VARCHAR(30),
  contact_name VARCHAR(100),
  email        VARCHAR(100),
  phone        VARCHAR(30),
  address      TEXT,
  category     VARCHAR(50),
  notes        TEXT,
  is_active    BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE cost_centers (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT          NOT NULL,
  name        VARCHAR(100) NOT NULL,
  code        VARCHAR(30),
  description TEXT,
  manager     VARCHAR(100),
  budget      DECIMAL(14,2),
  is_active   BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE contracts (
  id              SERIAL PRIMARY KEY,
  tenant_id       INT          NOT NULL,
  title           VARCHAR(200) NOT NULL,
  contract_number VARCHAR(50),
  provider_id     INT,
  cost_center_id  INT,
  contract_type   VARCHAR(50),
  start_date      DATE,
  end_date        DATE,
  value           DECIMAL(14,2),
  description     TEXT,
  alert_days      INT          DEFAULT 30,
  status          VARCHAR(30)  DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  created_by      INT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id)      ON DELETE CASCADE,
  FOREIGN KEY (provider_id)    REFERENCES providers(id)    ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)     REFERENCES users(id)        ON DELETE SET NULL
);

CREATE TABLE purchase_orders (
  id              SERIAL PRIMARY KEY,
  tenant_id       INT          NOT NULL,
  provider_id     INT,
  cost_center_id  INT,
  po_number       VARCHAR(50),
  status          VARCHAR(30)  DEFAULT 'draft' CHECK (status IN ('draft','sent','partial','received','cancelled')),
  ordered_at      DATE,
  expected_at     DATE,
  received_at     DATE,
  notes           TEXT,
  total           DECIMAL(14,2) DEFAULT 0,
  created_by      INT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id)      ON DELETE CASCADE,
  FOREIGN KEY (provider_id)    REFERENCES providers(id)    ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)     REFERENCES users(id)        ON DELETE SET NULL
);

CREATE TABLE purchase_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT          NOT NULL,
  description  TEXT         NOT NULL,
  quantity     FLOAT        DEFAULT 1,
  unit         VARCHAR(30),
  unit_price   DECIMAL(12,2) DEFAULT 0,
  total_price  DECIMAL(12,2) DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- ============================================================
--  MODULE: REQUESTS & TICKETS
-- ============================================================

CREATE TABLE requests (
  id            SERIAL PRIMARY KEY,
  tenant_id     INT         NOT NULL,
  request_type  VARCHAR(30) NOT NULL CHECK (request_type IN ('loan','supply','maintenance','purchase','other')),
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  priority      VARCHAR(20)  DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status        VARCHAR(30)  DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed','cancelled')),
  asset_id      INT,
  supply_id     INT,
  quantity      INT,
  notes         TEXT,
  rejection_reason TEXT,
  requested_by  INT,
  approved_by   INT,
  requested_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  resolved_at   TIMESTAMP    NULL,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (approved_by)  REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (asset_id)     REFERENCES assets(id)    ON DELETE SET NULL,
  FOREIGN KEY (supply_id)    REFERENCES supplies(id)  ON DELETE SET NULL
);

CREATE TABLE tickets (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT          NOT NULL,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  priority     VARCHAR(20)  DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status       VARCHAR(30)  DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
  category     VARCHAR(50),
  asset_id     INT,
  assigned_to  INT,
  reported_by  INT,
  sla_hours    INT          DEFAULT 24,
  resolved_at  TIMESTAMP    NULL,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id)    REFERENCES assets(id)  ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id)   ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id)   ON DELETE SET NULL
);

CREATE TABLE ticket_comments (
  id          SERIAL PRIMARY KEY,
  ticket_id   INT     NOT NULL,
  user_id     INT,
  comment     TEXT    NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);

-- ============================================================
--  SHARED: ACTIVITY LOG
-- ============================================================

CREATE TABLE activity_logs (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT         NOT NULL,
  user_id      INT,
  module       VARCHAR(50) NOT NULL,
  action       VARCHAR(50) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    INT,
  details      JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);

-- ============================================================
--  TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_supplies_updated_at
  BEFORE UPDATE ON supplies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_personnel_updated_at
  BEFORE UPDATE ON personnel
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_maintenance_records_updated_at
  BEFORE UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
--  TRIGGERS: keep asset status in sync with loans
-- ============================================================

CREATE OR REPLACE FUNCTION after_loan_insert_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE assets SET status = 'loaned' WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_loan_insert
  AFTER INSERT ON loans
  FOR EACH ROW EXECUTE FUNCTION after_loan_insert_fn();

CREATE OR REPLACE FUNCTION after_loan_update_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'returned' THEN
    UPDATE assets SET status = 'available'
    WHERE id = NEW.asset_id AND status = 'loaned';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_loan_update
  AFTER UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION after_loan_update_fn();

-- ============================================================
--  TRIGGERS: keep asset status in sync with maintenance
-- ============================================================

CREATE OR REPLACE FUNCTION after_maintenance_insert_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' THEN
    UPDATE assets SET status = 'maintenance' WHERE id = NEW.asset_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_maintenance_insert
  AFTER INSERT ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION after_maintenance_insert_fn();

CREATE OR REPLACE FUNCTION after_maintenance_update_fn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' OR NEW.status = 'cancelled' THEN
    UPDATE assets
    SET status = 'available', last_maintenance = CURRENT_DATE
    WHERE id = NEW.asset_id AND status = 'maintenance';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_maintenance_update
  AFTER UPDATE ON maintenance_records
  FOR EACH ROW EXECUTE FUNCTION after_maintenance_update_fn();

-- ============================================================
--  SEED DATA
-- ============================================================

INSERT INTO modules (code, name, description, icon, color, sort_order) VALUES
('inventory',   'Inventario',          'Gestión de activos, equipos y ubicaciones',      'Package',        '#6366F1', 1),
('loans',       'Préstamos',           'Control de préstamo y devolución de equipos',    'ArrowRightLeft', '#0EA5E9', 2),
('maintenance', 'Mantenimientos',      'Programación y seguimiento de mantenimientos',   'Wrench',         '#F59E0B', 3),
('personnel',   'Gestión de Personal', 'Administración de empleados y departamentos',    'Users',          '#10B981', 4),
('monitoring',  'Monitoreo',           'Monitoreo en tiempo real de equipos con agente', 'Activity',       '#EF4444', 5);

-- Super admin tenant
INSERT INTO tenants (name, slug, status, plan, contact_email) VALUES
('ModulaERP Admin', 'admin', 'active', 'enterprise', 'admin@modulaerp.com');

-- Super admin user  (password: admin123 — change immediately)
-- bcrypt hash of 'admin123'
INSERT INTO users (tenant_id, email, password, name, role) VALUES
(1, 'admin@modulaerp.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWq', 'Super Admin', 'super_admin');

-- Enable all modules for admin tenant
INSERT INTO tenant_modules (tenant_id, module_id) SELECT 1, id FROM modules;

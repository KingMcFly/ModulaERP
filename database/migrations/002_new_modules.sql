-- ============================================================
--  Migration 002 — New Modules: Providers, Purchases,
--  Requests, Contracts, Cost Centers, Tickets
-- ============================================================

USE modulaerp_db;

-- ── Cost centers ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cost_centers (
  id          INT PRIMARY KEY AUTO_INCREMENT,
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

-- ── Providers ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS providers (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id     INT          NOT NULL,
  name          VARCHAR(150) NOT NULL,
  rut           VARCHAR(20),
  contact_name  VARCHAR(100),
  email         VARCHAR(100),
  phone         VARCHAR(30),
  address       TEXT,
  category      VARCHAR(50),
  notes         TEXT,
  is_active     BOOLEAN      DEFAULT TRUE,
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- ── Purchases / Purchase orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  provider_id     INT,
  cost_center_id  INT,
  po_number       VARCHAR(50),
  status          ENUM('draft','sent','partial','received','cancelled') DEFAULT 'draft',
  ordered_at      DATE,
  expected_at     DATE,
  received_at     DATE,
  subtotal        DECIMAL(14,2) DEFAULT 0,
  tax             DECIMAL(14,2) DEFAULT 0,
  total           DECIMAL(14,2) DEFAULT 0,
  notes           TEXT,
  created_by      INT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id)     ON DELETE CASCADE,
  FOREIGN KEY (provider_id)    REFERENCES providers(id)   ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)     REFERENCES users(id)       ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  order_id        INT          NOT NULL,
  description     VARCHAR(255) NOT NULL,
  quantity        DECIMAL(10,3) DEFAULT 1,
  unit            VARCHAR(20),
  unit_price      DECIMAL(12,2) DEFAULT 0,
  total_price     DECIMAL(14,2) DEFAULT 0,
  asset_id        INT,
  supply_id       INT,
  FOREIGN KEY (order_id)  REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (asset_id)  REFERENCES assets(id)          ON DELETE SET NULL,
  FOREIGN KEY (supply_id) REFERENCES supplies(id)        ON DELETE SET NULL
);

-- ── Internal requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requests (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  request_type    ENUM('loan','supply','maintenance','purchase','other') NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  status          ENUM('pending','approved','rejected','completed','cancelled') DEFAULT 'pending',
  priority        ENUM('low','medium','high','urgent') DEFAULT 'medium',
  requested_by    INT,
  approved_by     INT,
  asset_id        INT,
  supply_id       INT,
  quantity        INT,
  requested_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  resolved_at     TIMESTAMP    NULL,
  rejection_reason TEXT,
  notes           TEXT,
  FOREIGN KEY (tenant_id)    REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (approved_by)  REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (asset_id)     REFERENCES assets(id)    ON DELETE SET NULL,
  FOREIGN KEY (supply_id)    REFERENCES supplies(id)  ON DELETE SET NULL
);

-- ── Contracts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contracts (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  provider_id     INT,
  title           VARCHAR(200) NOT NULL,
  contract_number VARCHAR(50),
  status          ENUM('active','expired','pending','cancelled') DEFAULT 'active',
  contract_type   VARCHAR(50),
  start_date      DATE,
  end_date        DATE,
  value           DECIMAL(14,2),
  description     TEXT,
  file_path       VARCHAR(255),
  alert_days      INT          DEFAULT 30,
  cost_center_id  INT,
  created_by      INT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)      REFERENCES tenants(id)      ON DELETE CASCADE,
  FOREIGN KEY (provider_id)    REFERENCES providers(id)    ON DELETE SET NULL,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)     REFERENCES users(id)        ON DELETE SET NULL
);

-- ── Tickets / Helpdesk ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id       INT          NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  status          ENUM('open','in_progress','waiting','resolved','closed') DEFAULT 'open',
  priority        ENUM('low','medium','high','critical') DEFAULT 'medium',
  category        VARCHAR(50),
  asset_id        INT,
  reported_by     INT,
  assigned_to     INT,
  resolved_at     TIMESTAMP    NULL,
  sla_hours       INT          DEFAULT 24,
  resolution_notes TEXT,
  created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id)   ON DELETE CASCADE,
  FOREIGN KEY (asset_id)    REFERENCES assets(id)    ON DELETE SET NULL,
  FOREIGN KEY (reported_by) REFERENCES users(id)     ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id)     ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  ticket_id  INT  NOT NULL,
  user_id    INT,
  comment    TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE SET NULL
);

-- ── Register new modules ──────────────────────────────────────────────────────
INSERT IGNORE INTO modules (code, name, description, icon, color, sort_order) VALUES
  ('providers',    'Proveedores',   'Gestión de proveedores y contactos',     'Truck',         '#8B5CF6', 50),
  ('purchases',    'Compras',       'Órdenes de compra y recepción',           'ShoppingCart',  '#EC4899', 55),
  ('requests',     'Solicitudes',   'Solicitudes internas y aprobaciones',    'ClipboardList', '#F59E0B', 60),
  ('contracts',    'Contratos',     'Contratos y seguimiento de vencimientos', 'FileCheck',     '#14B8A6', 65),
  ('tickets',      'Mesa de ayuda', 'Tickets y soporte técnico interno',       'LifeBuoy',      '#EF4444', 70),
  ('cost_centers', 'Centros de costo', 'Control de costos por área',          'PieChart',      '#6366F1', 75);

-- ── Plan limits table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_limits (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  plan        ENUM('starter','professional','enterprise') NOT NULL,
  resource    VARCHAR(50) NOT NULL,  -- 'assets', 'users', 'storage_mb', etc.
  max_value   INT         NOT NULL,  -- -1 = unlimited
  UNIQUE KEY uq_plan_resource (plan, resource)
);

-- Default plan limits
INSERT IGNORE INTO plan_limits (plan, resource, max_value) VALUES
  ('starter',      'assets',    100),
  ('starter',      'users',     5),
  ('starter',      'locations', 5),
  ('professional', 'assets',    1000),
  ('professional', 'users',     25),
  ('professional', 'locations', 50),
  ('enterprise',   'assets',    -1),
  ('enterprise',   'users',     -1),
  ('enterprise',   'locations', -1);

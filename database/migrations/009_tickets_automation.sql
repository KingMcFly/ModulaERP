-- ════════════════════════════════════════════════════════════════════════════
-- 009 — Tickets: automatizaciones (plantillas, auto-asignación, KB, recurrentes)
-- Idempotente; también se aplica al arrancar el backend.
-- ════════════════════════════════════════════════════════════════════════════

-- Plantillas de respuesta
CREATE TABLE IF NOT EXISTS ticket_templates (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title      VARCHAR(120) NOT NULL,
  body       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reglas de auto-asignación (al crear un ticket)
CREATE TABLE IF NOT EXISTS ticket_assignment_rules (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id  INT REFERENCES ticket_categories(id) ON DELETE CASCADE,
  type         VARCHAR(12),                 -- incident|request|null (cualquiera)
  level        VARCHAR(4),                  -- n1|n2|n3|null
  assign_to    INT REFERENCES users(id) ON DELETE CASCADE,
  sort_order   INT DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT true
);

-- Base de conocimiento
CREATE TABLE IF NOT EXISTS kb_articles (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id  INT REFERENCES ticket_categories(id) ON DELETE SET NULL,
  title        VARCHAR(200) NOT NULL,
  body         TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  views        INT NOT NULL DEFAULT 0,
  created_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets recurrentes / mantención programada
CREATE TABLE IF NOT EXISTS ticket_recurrences (
  id           SERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  type         VARCHAR(12) NOT NULL DEFAULT 'request',
  category_id  INT REFERENCES ticket_categories(id) ON DELETE SET NULL,
  impact       VARCHAR(12) DEFAULT 'low',
  urgency      VARCHAR(12) DEFAULT 'low',
  assign_to    INT REFERENCES users(id) ON DELETE SET NULL,
  every_days   INT NOT NULL DEFAULT 30,
  next_run_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_tenant   ON kb_articles (tenant_id, is_published);
CREATE INDEX IF NOT EXISTS idx_rec_next     ON ticket_recurrences (is_active, next_run_at);

-- ════════════════════════════════════════════════════════════════════════════
-- 008 — Tickets ServiceDesk: incidencias/solicitudes, N1/N2/N3, SLA, escalamiento
-- Extiende la tabla `tickets` existente (sin borrar datos) y agrega las tablas
-- del módulo. Idempotente — también se aplica en backend/src/index.js al arrancar.
-- Multiempresa: todas las tablas llevan tenant_id.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Extender la tabla tickets ──────────────────────────────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number       VARCHAR(24);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type                VARCHAR(12)  NOT NULL DEFAULT 'incident'; -- incident | request
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id         INT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS subcategory_id      INT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS impact              VARCHAR(12)  NOT NULL DEFAULT 'low';    -- low|medium|high|critical
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency             VARCHAR(12)  NOT NULL DEFAULT 'low';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS level               VARCHAR(4)   NOT NULL DEFAULT 'n1';     -- n1|n2|n3
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS team_id             INT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS channel             VARCHAR(16)  NOT NULL DEFAULT 'web';    -- web|email|whatsapp|phone|manual
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_policy_id       INT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_due  TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_due      TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_at   TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_at       TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_ms       BIGINT       NOT NULL DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_type     VARCHAR(28);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_note     TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reopened_count      INT          NOT NULL DEFAULT 0;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP;

-- Ampliar el CHECK de status (el original solo permitía 5 estados)
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
-- Migrar estados antiguos al nuevo modelo
UPDATE tickets SET status = 'waiting_user' WHERE status = 'waiting';
ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'new';
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN (
  'new','open','assigned','in_progress','waiting_user','waiting_vendor',
  'escalated','resolved','closed','reopened','cancelled'
));

-- Numerar tickets existentes que no tengan ticket_number
UPDATE tickets SET ticket_number =
  (CASE WHEN type = 'request' THEN 'REQ-' ELSE 'INC-' END) ||
  TO_CHAR(COALESCE(created_at, NOW()), 'YYYY') || '-' || LPAD(id::text, 5, '0')
WHERE ticket_number IS NULL;

-- ── 2. Categorías y subcategorías ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_categories (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(80) NOT NULL,
  type        VARCHAR(12) NOT NULL DEFAULT 'both',   -- incident|request|both
  color       VARCHAR(7)  DEFAULT '#6B7280',
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_subcategories (
  id            SERIAL PRIMARY KEY,
  tenant_id     INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id   INT NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
  name          VARCHAR(80) NOT NULL,
  default_level VARCHAR(4) DEFAULT 'n1',
  is_active     BOOLEAN NOT NULL DEFAULT true
);

-- ── 3. Comentarios (extiende la tabla existente) ──────────────────────────────
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS sent_by_email BOOLEAN DEFAULT false;
ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS tenant_id     INT;
UPDATE ticket_comments tc SET tenant_id = t.tenant_id
  FROM tickets t WHERE tc.ticket_id = t.id AND tc.tenant_id IS NULL;

-- ── 4. Adjuntos (estructura lista; almacenamiento se define en Fase 5) ────────
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id          SERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  comment_id  INT REFERENCES ticket_comments(id) ON DELETE SET NULL,
  file_name   VARCHAR(255) NOT NULL,
  mime        VARCHAR(120),
  size_bytes  BIGINT,
  url         TEXT,
  uploaded_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. Historial / auditoría del ticket ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_history (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id    INT REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(40) NOT NULL,   -- created|status|priority|assigned|level|escalated|comment|attachment|resolved|closed|reopened|sla
  field       VARCHAR(40),
  old_value   TEXT,
  new_value   TEXT,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. Escalamientos N1/N2/N3 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_escalations (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id   INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  from_level  VARCHAR(4),
  to_level    VARCHAR(4) NOT NULL,
  from_user   INT REFERENCES users(id) ON DELETE SET NULL,
  to_user     INT REFERENCES users(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Políticas SLA ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_sla_policies (
  id                  SERIAL PRIMARY KEY,
  tenant_id           INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name                VARCHAR(80) NOT NULL,
  type                VARCHAR(12) DEFAULT 'both',          -- incident|request|both
  priority            VARCHAR(12) NOT NULL,                -- low|medium|high|critical
  first_response_mins INT NOT NULL,
  resolution_mins     INT NOT NULL,
  is_active           BOOLEAN NOT NULL DEFAULT true
);

-- ── 8. Encuesta de satisfacción ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ticket_ratings (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id  INT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
  score      SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT,
  rated_by   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. Equipos de soporte y miembros (nivel por técnico) ──────────────────────
CREATE TABLE IF NOT EXISTS support_teams (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(80) NOT NULL,
  level      VARCHAR(4),                -- nivel principal del equipo (n1/n2/n3) opcional
  is_active  BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS support_team_members (
  id         SERIAL PRIMARY KEY,
  tenant_id  INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  team_id    INT REFERENCES support_teams(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level      VARCHAR(4) NOT NULL DEFAULT 'n1',  -- N1/N2/N3 del técnico
  UNIQUE (tenant_id, user_id)
);

-- ── 10. Índices ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_tenant       ON tickets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status       ON tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned     ON tickets (tenant_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_level        ON tickets (tenant_id, level);
CREATE INDEX IF NOT EXISTS idx_tickets_number       ON tickets (tenant_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_tk_history_ticket    ON ticket_history (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tk_comments_ticket   ON ticket_comments (ticket_id);
CREATE INDEX IF NOT EXISTS idx_tk_esc_ticket        ON ticket_escalations (ticket_id);
CREATE INDEX IF NOT EXISTS idx_stm_user             ON support_team_members (tenant_id, user_id);

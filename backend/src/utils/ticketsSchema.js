// ── Tickets ServiceDesk schema bootstrap (idempotent) ─────────────────────────
// Mirrors database/migrations/008_tickets_servicedesk.sql so the module's tables
// exist even if migrations aren't run manually. Each chunk is isolated so one
// failure never blocks the rest. Safe to run on every startup.
import db from '../db.js';

export async function ensureTicketsSchema() {
  // 1. Extend tickets with the new ServiceDesk columns
  await db.query(`
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_number      VARCHAR(24);
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS type               VARCHAR(12)  NOT NULL DEFAULT 'incident';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id        INT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS subcategory_id     INT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS impact             VARCHAR(12)  NOT NULL DEFAULT 'low';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency            VARCHAR(12)  NOT NULL DEFAULT 'low';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS level              VARCHAR(4)   NOT NULL DEFAULT 'n1';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS team_id            INT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS channel            VARCHAR(16)  NOT NULL DEFAULT 'web';
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_policy_id      INT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_due TIMESTAMPTZ;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_due     TIMESTAMPTZ;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS first_response_at  TIMESTAMPTZ;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_at      TIMESTAMPTZ;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_paused_ms      BIGINT       NOT NULL DEFAULT 0;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS closed_at          TIMESTAMPTZ;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_type    VARCHAR(28);
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolution_note    TEXT;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS reopened_count     INT          NOT NULL DEFAULT 0;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMP    DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_due_notified    BOOLEAN     NOT NULL DEFAULT false;
    ALTER TABLE tickets ADD COLUMN IF NOT EXISTS sla_breach_notified BOOLEAN     NOT NULL DEFAULT false;
  `).catch(err => console.error('[DB] tickets columns init failed:', err.message));

  // 2. Widen the status CHECK to the full state machine
  await db.query(`ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check`).catch(() => {});
  await db.query(`UPDATE tickets SET status='waiting_user' WHERE status='waiting'`).catch(() => {});
  await db.query(`ALTER TABLE tickets ALTER COLUMN status SET DEFAULT 'new'`).catch(() => {});
  await db.query(`
    ALTER TABLE tickets ADD CONSTRAINT tickets_status_check CHECK (status IN (
      'new','open','assigned','in_progress','waiting_user','waiting_vendor',
      'escalated','resolved','closed','reopened','cancelled'))
  `).catch(() => {/* already present */});

  // 3. Backfill ticket numbers
  await db.query(`
    UPDATE tickets SET ticket_number =
      (CASE WHEN type='request' THEN 'REQ-' ELSE 'INC-' END) ||
      TO_CHAR(COALESCE(created_at, NOW()), 'YYYY') || '-' || LPAD(id::text, 5, '0')
    WHERE ticket_number IS NULL
  `).catch(() => {});

  // 4. New tables
  await db.query(`
    CREATE TABLE IF NOT EXISTS ticket_categories (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL, type VARCHAR(12) NOT NULL DEFAULT 'both',
      color VARCHAR(7) DEFAULT '#6B7280', sort_order INT DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_subcategories (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category_id INT NOT NULL REFERENCES ticket_categories(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL, default_level VARCHAR(4) DEFAULT 'n1', is_active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS ticket_attachments (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      comment_id INT REFERENCES ticket_comments(id) ON DELETE SET NULL,
      file_name VARCHAR(255) NOT NULL, mime VARCHAR(120), size_bytes BIGINT, url TEXT, data BYTEA,
      uploaded_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_history (
      id BIGSERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      actor_id INT REFERENCES users(id) ON DELETE SET NULL,
      action VARCHAR(40) NOT NULL, field VARCHAR(40), old_value TEXT, new_value TEXT, note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_escalations (
      id BIGSERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      from_level VARCHAR(4), to_level VARCHAR(4) NOT NULL,
      from_user INT REFERENCES users(id) ON DELETE SET NULL,
      to_user INT REFERENCES users(id) ON DELETE SET NULL,
      reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_sla_policies (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL, type VARCHAR(12) DEFAULT 'both', priority VARCHAR(12) NOT NULL,
      first_response_mins INT NOT NULL, resolution_mins INT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS ticket_ratings (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      ticket_id INT NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
      score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5), comment TEXT,
      rated_by INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS support_teams (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(80) NOT NULL, level VARCHAR(4), is_active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS support_team_members (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      team_id INT REFERENCES support_teams(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      level VARCHAR(4) NOT NULL DEFAULT 'n1', UNIQUE (tenant_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS ticket_templates (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title VARCHAR(120) NOT NULL, body TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_assignment_rules (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category_id INT REFERENCES ticket_categories(id) ON DELETE CASCADE,
      type VARCHAR(12), level VARCHAR(4),
      assign_to INT REFERENCES users(id) ON DELETE CASCADE,
      sort_order INT DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT true
    );
    CREATE TABLE IF NOT EXISTS kb_articles (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      category_id INT REFERENCES ticket_categories(id) ON DELETE SET NULL,
      title VARCHAR(200) NOT NULL, body TEXT NOT NULL,
      is_published BOOLEAN NOT NULL DEFAULT true, views INT NOT NULL DEFAULT 0,
      created_by INT REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ticket_recurrences (
      id SERIAL PRIMARY KEY,
      tenant_id INT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL, description TEXT, type VARCHAR(12) NOT NULL DEFAULT 'request',
      category_id INT REFERENCES ticket_categories(id) ON DELETE SET NULL,
      impact VARCHAR(12) DEFAULT 'low', urgency VARCHAR(12) DEFAULT 'low',
      assign_to INT REFERENCES users(id) ON DELETE SET NULL,
      every_days INT NOT NULL DEFAULT 30, next_run_at DATE NOT NULL DEFAULT CURRENT_DATE,
      is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).catch(err => console.error('[DB] tickets tables init failed:', err.message));

  // 5. Extend comments + attachments
  await db.query(`
    ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS sent_by_email BOOLEAN DEFAULT false;
    ALTER TABLE ticket_comments ADD COLUMN IF NOT EXISTS tenant_id INT;
    ALTER TABLE ticket_attachments ADD COLUMN IF NOT EXISTS data BYTEA;
  `).catch(() => {});
  await db.query(`UPDATE ticket_comments tc SET tenant_id = t.tenant_id FROM tickets t WHERE tc.ticket_id = t.id AND tc.tenant_id IS NULL`).catch(() => {});

  // 6. Indexes
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets (tenant_id, status);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets (tenant_id, assigned_to);
    CREATE INDEX IF NOT EXISTS idx_tickets_level    ON tickets (tenant_id, level);
    CREATE INDEX IF NOT EXISTS idx_tk_history_ticket ON ticket_history (ticket_id);
    CREATE INDEX IF NOT EXISTS idx_tk_esc_ticket     ON ticket_escalations (ticket_id);
    CREATE INDEX IF NOT EXISTS idx_stm_user          ON support_team_members (tenant_id, user_id);
  `).catch(() => {});
}

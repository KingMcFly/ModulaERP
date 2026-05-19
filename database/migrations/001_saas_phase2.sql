-- ============================================================
--  Migration 001 — SaaS Phase 2
--  Run once after initial schema.sql
-- ============================================================

USE modulaerp_db;

-- Attachments (assets, loans, maintenance, personnel, supplies)
CREATE TABLE IF NOT EXISTS attachments (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id    INT          NOT NULL,
  entity_type  VARCHAR(50)  NOT NULL,
  entity_id    INT          NOT NULL,
  file_path    VARCHAR(255) NOT NULL,
  file_name    VARCHAR(255) NOT NULL,
  file_size    INT,
  mime_type    VARCHAR(100),
  uploaded_by  INT,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id)   REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)   ON DELETE SET NULL,
  INDEX idx_attachments_entity (tenant_id, entity_type, entity_id)
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  token       VARCHAR(64)  UNIQUE NOT NULL,
  expires_at  TIMESTAMP    NOT NULL,
  used_at     TIMESTAMP    NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_prt_token (token)
);

-- Auto-purge expired tokens (optional, run via cron)
-- DELETE FROM password_reset_tokens WHERE expires_at < NOW() - INTERVAL 7 DAY;

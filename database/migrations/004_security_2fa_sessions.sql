-- ════════════════════════════════════════════════════════════════════════════
-- 004 — Seguridad: 2FA (TOTP) + gestión de sesiones por dispositivo
-- Aplicado automáticamente al arrancar el backend (ver backend/src/index.js),
-- incluido aquí para ejecución manual / documentación del esquema.
-- ════════════════════════════════════════════════════════════════════════════

-- Doble autenticación (TOTP, compatible con Google Authenticator / Authy / etc.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;

-- Sesiones activas por dispositivo (para listarlas y revocarlas)
CREATE TABLE IF NOT EXISTS user_sessions (
  id           BIGSERIAL PRIMARY KEY,
  session_id   VARCHAR(64) UNIQUE NOT NULL,
  user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent   TEXT,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session ON user_sessions (session_id);

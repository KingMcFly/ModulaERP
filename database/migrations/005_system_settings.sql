-- ════════════════════════════════════════════════════════════════════════════
-- 005 — Configuración regional de la plataforma (idioma, zona horaria, moneda)
-- Aplicada automáticamente al arrancar el backend (backend/src/index.js).
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS system_settings (
  id          INT PRIMARY KEY,
  locale      VARCHAR(10) NOT NULL DEFAULT 'es-CL',
  timezone    VARCHAR(64) NOT NULL DEFAULT 'America/Santiago',
  currency    VARCHAR(8)  NOT NULL DEFAULT 'CLP',
  date_style  VARCHAR(10) NOT NULL DEFAULT 'medium',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

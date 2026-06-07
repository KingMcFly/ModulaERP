-- ════════════════════════════════════════════════════════════════════════════
-- 007 — Apariencia: marca, color de acento y logotipo del panel
-- Aplicada automáticamente al arrancar el backend (backend/src/index.js).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS brand_name   VARCHAR(60)  NOT NULL DEFAULT 'FB Core';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7)   NOT NULL DEFAULT '#F2B045';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS logo_url     VARCHAR(500);

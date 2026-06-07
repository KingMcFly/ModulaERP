-- ════════════════════════════════════════════════════════════════════════════
-- 006 — Notificaciones por correo de eventos críticos del sistema
-- Aplicada automáticamente al arrancar el backend (backend/src/index.js).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notify_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notify_email   VARCHAR(254);
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS notify_events  JSONB NOT NULL DEFAULT '{}'::jsonb;

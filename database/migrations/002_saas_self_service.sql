-- ============================================================
-- Migration 002: SaaS Self-Service + Session Control
-- FB Core ERP - FBSystems
-- ============================================================

-- 1. Subscription plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id                  SERIAL PRIMARY KEY,
  code                VARCHAR(50) UNIQUE NOT NULL,
  name                VARCHAR(100) NOT NULL,
  price               INTEGER NOT NULL DEFAULT 0,
  max_users           INTEGER NOT NULL DEFAULT 5,
  max_technicians     INTEGER NOT NULL DEFAULT 2,
  max_assets          INTEGER NOT NULL DEFAULT 30,
  max_trial_modules   INTEGER NOT NULL DEFAULT 2,
  trial_days          INTEGER NOT NULL DEFAULT 30,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMP DEFAULT NOW()
);

INSERT INTO subscription_plans (code, name, price, max_users, max_technicians, max_assets, max_trial_modules, trial_days)
VALUES
  ('starter_free',  'Starter Free',   0,       5,   2,   30,   2, 30),
  ('starter',       'Starter',        29000,   10,  5,   100,  5, 0),
  ('professional',  'Professional',   79000,   25,  10,  500,  11, 0),
  ('enterprise',    'Enterprise',     199000,  -1,  -1,  -1,   11, 0)
ON CONFLICT (code) DO NOTHING;

-- 2. Extend tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_user_id    INTEGER;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at    TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users        INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_technicians  INTEGER DEFAULT 2;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_assets       INTEGER DEFAULT 30;

-- 3. Extend tenant_modules table for trial management
ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS type       VARCHAR(20) DEFAULT 'manual';
ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS status     VARCHAR(20) DEFAULT 'active';
ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS unlimited  BOOLEAN DEFAULT FALSE;
ALTER TABLE tenant_modules ADD COLUMN IF NOT EXISTS starts_at  TIMESTAMP DEFAULT NOW();

-- Mark existing mandatory module records
UPDATE tenant_modules tm
SET    type = 'required', unlimited = TRUE, status = 'active'
FROM   modules m
WHERE  tm.module_id = m.id AND m.code IN ('inventory', 'personnel');

-- 4. Extend users table for session control and technician flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_technician      BOOLEAN DEFAULT FALSE;

-- 5. Update plan_limits to include starter_free and technicians resource
INSERT INTO plan_limits (plan, resource, max_value)
VALUES
  ('starter_free', 'assets',      30),
  ('starter_free', 'users',       5),
  ('starter_free', 'locations',   5),
  ('starter_free', 'technicians', 2)
ON CONFLICT (plan, resource) DO NOTHING;

INSERT INTO plan_limits (plan, resource, max_value)
VALUES
  ('starter',      'technicians', 5),
  ('professional', 'technicians', 10),
  ('enterprise',   'technicians', -1)
ON CONFLICT (plan, resource) DO NOTHING;

-- Add unique constraint on plan_limits if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plan_limits_plan_resource_key'
  ) THEN
    ALTER TABLE plan_limits ADD CONSTRAINT plan_limits_plan_resource_key UNIQUE (plan, resource);
  END IF;
END $$;

-- 6. Public modules view (for registration flow)
CREATE OR REPLACE VIEW public_modules AS
SELECT code, name, description, icon, color, sort_order
FROM   modules
WHERE  is_active = TRUE
ORDER  BY sort_order;

-- ============================================================
-- Migration 003: Fix starter_free plan constraint
-- Run this on Aiven (PostgreSQL) to allow self-registration
-- ============================================================

-- 1. Update tenants.plan CHECK constraint to include 'starter_free'
DO $$
BEGIN
  -- Drop any existing check constraint on plan column
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'tenants'
      AND c.contype = 'c'
      AND c.conname ILIKE '%plan%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE tenants DROP CONSTRAINT ' || c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'tenants'
        AND c.contype = 'c'
        AND c.conname ILIKE '%plan%'
      LIMIT 1
    );
  END IF;
END $$;

ALTER TABLE tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('starter_free', 'starter', 'professional', 'enterprise'));

-- 2. Ensure plan_limits accepts 'starter_free' (in case it's an ENUM)
-- If plan_limits.plan is a VARCHAR/TEXT, the INSERT in migration 002 already works.
-- If it's still an ENUM constraint, drop it:
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'plan_limits'
      AND c.contype = 'c'
      AND c.conname ILIKE '%plan%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE plan_limits DROP CONSTRAINT ' || c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE t.relname = 'plan_limits'
        AND c.contype = 'c'
        AND c.conname ILIKE '%plan%'
      LIMIT 1
    );
  END IF;
END $$;

-- 3. Ensure starter_free limits exist
INSERT INTO plan_limits (plan, resource, max_value)
VALUES
  ('starter_free', 'assets',      30),
  ('starter_free', 'users',        5),
  ('starter_free', 'locations',    5),
  ('starter_free', 'technicians',  2)
ON CONFLICT (plan, resource) DO NOTHING;

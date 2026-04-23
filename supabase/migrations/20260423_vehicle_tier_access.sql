-- Create vehicle_tier_mapping table
-- Manages which vehicles are allowed for each service tier
CREATE TABLE IF NOT EXISTS vehicle_tier_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id TEXT NOT NULL, -- e.g., 'hiace', 'suv', 'minicar'
  tier TEXT NOT NULL, -- e.g., 'reguler', 'semi-executive', 'executive'
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Composite unique constraint
  CONSTRAINT vehicle_tier_unique UNIQUE (vehicle_id, tier)
);

-- Create vehicle_access_logs table
-- Tracks every vehicle access attempt for audit and monitoring
CREATE TABLE IF NOT EXISTS vehicle_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_id TEXT NOT NULL, -- e.g., 'hiace', 'suv', 'minicar'
  tier TEXT NOT NULL, -- e.g., 'reguler', 'semi-executive', 'executive'
  action TEXT NOT NULL CHECK (action IN ('view', 'book', 'bypass_attempt')),
  result TEXT NOT NULL CHECK (result IN ('allowed', 'blocked', 'not_configured')),
  reason TEXT, -- Optional: why it was blocked
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if the table was created by a previous partial run
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehicle_access_logs' AND column_name='result') THEN
        ALTER TABLE vehicle_access_logs ADD COLUMN result TEXT NOT NULL DEFAULT 'allowed' CHECK (result IN ('allowed', 'blocked', 'not_configured'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vehicle_access_logs' AND column_name='created_at') THEN
        ALTER TABLE vehicle_access_logs ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_vehicle_tier_mapping_vehicle ON vehicle_tier_mapping(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_tier_mapping_tier ON vehicle_tier_mapping(tier);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_logs_vehicle ON vehicle_access_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_logs_tier ON vehicle_access_logs(tier);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_logs_user ON vehicle_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_logs_created_at ON vehicle_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_access_logs_result ON vehicle_access_logs(result);

-- RLS: Admins can read/write vehicle_tier_mapping
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage vehicle tier mapping" ON vehicle_tier_mapping;
    CREATE POLICY "Admins can manage vehicle tier mapping"
    ON vehicle_tier_mapping
    USING (auth.jwt() ->> 'role' = 'admin')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin');
END $$;

-- RLS: Admins can read access logs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view vehicle access logs" ON vehicle_access_logs;
    CREATE POLICY "Admins can view vehicle access logs"
    ON vehicle_access_logs
    FOR SELECT
    USING (auth.jwt() ->> 'role' = 'admin');
END $$;

-- RLS: System (service role) can insert logs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "System can log vehicle access" ON vehicle_access_logs;
    CREATE POLICY "System can log vehicle access"
    ON vehicle_access_logs
    FOR INSERT
    WITH CHECK (true);
END $$;

-- RLS: Admins can delete old logs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can delete old access logs" ON vehicle_access_logs;
    CREATE POLICY "Admins can delete old access logs"
    ON vehicle_access_logs
    FOR DELETE
    USING (auth.jwt() ->> 'role' = 'admin');
END $$;

-- Enable RLS
ALTER TABLE vehicle_tier_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_access_logs ENABLE ROW LEVEL SECURITY;

-- Initialize default mappings: all vehicles allowed for all tiers
INSERT INTO vehicle_tier_mapping (vehicle_id, tier, allowed) VALUES
  ('hiace', 'reguler', true),
  ('hiace', 'semi-executive', true),
  ('hiace', 'executive', true),
  ('suv', 'reguler', true),
  ('suv', 'semi-executive', true),
  ('suv', 'executive', true),
  ('minicar', 'reguler', true),
  ('minicar', 'semi-executive', true),
  ('minicar', 'executive', true)
ON CONFLICT (vehicle_id, tier) DO NOTHING;

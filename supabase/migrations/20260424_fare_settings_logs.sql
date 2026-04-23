-- Migration: Add fare settings and activity logs
-- Handles flexible fare calculation configurations and admin audit trails

-- Add default fare settings to shuttle_settings if not already present
INSERT INTO shuttle_settings (key, value)
VALUES ('fare_settings', '{
  "calculationMethod": "distance_based",
  "minFare": 50000,
  "maxDistanceKm": 500,
  "enableLogging": true
}')
ON CONFLICT (key) DO NOTHING;

-- Create shuttle_activity_logs table
CREATE TABLE IF NOT EXISTS shuttle_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'update_fare_settings', 'update_service_price'
  details JSONB, -- Stores before/after values or relevant metadata
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for shuttle_activity_logs
ALTER TABLE shuttle_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view activity logs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can view shuttle activity logs" ON shuttle_activity_logs;
    CREATE POLICY "Admins can view shuttle activity logs"
    ON shuttle_activity_logs
    FOR SELECT
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
END $$;

-- Admins can insert activity logs
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can insert shuttle activity logs" ON shuttle_activity_logs;
    CREATE POLICY "Admins can insert shuttle activity logs"
    ON shuttle_activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
END $$;

-- System (service role) can insert logs
CREATE POLICY "System can log shuttle activity"
ON shuttle_activity_logs
FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shuttle_activity_logs_user ON shuttle_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shuttle_activity_logs_action ON shuttle_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_shuttle_activity_logs_created_at ON shuttle_activity_logs(created_at DESC);

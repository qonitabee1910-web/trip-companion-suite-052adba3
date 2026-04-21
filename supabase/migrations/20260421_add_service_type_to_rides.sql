-- Add service_type column to rides table
-- Supports 3 service types: standard, women, car

ALTER TABLE rides
ADD COLUMN service_type TEXT NOT NULL DEFAULT 'standard'
CHECK (service_type IN ('standard', 'women', 'car'));

-- Create index for service_type queries
CREATE INDEX IF NOT EXISTS idx_rides_service_type ON rides(service_type);

-- Create composite index for service_type + status queries
CREATE INDEX IF NOT EXISTS idx_rides_service_type_status ON rides(service_type, status);

-- Update RLS policy to include service_type in rider check
-- This ensures riders can see their rides regardless of service type
CREATE POLICY "Riders can view their own rides"
ON rides
FOR SELECT
USING (auth.uid() = rider_id);

-- Update RLS policy for drivers to see assigned rides with any service type
CREATE POLICY "Drivers can view their assigned rides"
ON rides
FOR SELECT
USING (auth.uid() = driver_id);

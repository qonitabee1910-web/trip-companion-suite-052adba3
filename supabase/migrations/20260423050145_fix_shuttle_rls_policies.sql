-- Fix RLS Policies for Shuttle Module
-- Use public.has_role() instead of auth.jwt() role claim for better reliability

-- 1. Fix vehicle_tier_mapping policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_tier_mapping') THEN
        DROP POLICY IF EXISTS "Admins can manage vehicle tier mapping" ON public.vehicle_tier_mapping;
        
        -- SELECT policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tier_mapping' AND policyname = 'Admins can view vehicle tier mapping') THEN
            CREATE POLICY "Admins can view vehicle tier mapping"
            ON public.vehicle_tier_mapping
            FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
        END IF;

        -- INSERT policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tier_mapping' AND policyname = 'Admins can insert vehicle tier mapping') THEN
            CREATE POLICY "Admins can insert vehicle tier mapping"
            ON public.vehicle_tier_mapping
            FOR INSERT
            TO authenticated
            WITH CHECK (public.has_role(auth.uid(), 'admin'));
        END IF;

        -- UPDATE policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tier_mapping' AND policyname = 'Admins can update vehicle tier mapping') THEN
            CREATE POLICY "Admins can update vehicle tier mapping"
            ON public.vehicle_tier_mapping
            FOR UPDATE
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'))
            WITH CHECK (public.has_role(auth.uid(), 'admin'));
        END IF;

        -- DELETE policy
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_tier_mapping' AND policyname = 'Admins can delete vehicle tier mapping') THEN
            CREATE POLICY "Admins can delete vehicle tier mapping"
            ON public.vehicle_tier_mapping
            FOR DELETE
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
        END IF;
    END IF;
END $$;

-- 2. Fix vehicle_access_logs policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_access_logs') THEN
        DROP POLICY IF EXISTS "Admins can view vehicle access logs" ON public.vehicle_access_logs;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_access_logs' AND policyname = 'Admins can view vehicle access logs') THEN
            CREATE POLICY "Admins can view vehicle access logs"
            ON public.vehicle_access_logs
            FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
        END IF;

        DROP POLICY IF EXISTS "Admins can delete old access logs" ON public.vehicle_access_logs;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_access_logs' AND policyname = 'Admins can delete old access logs') THEN
            CREATE POLICY "Admins can delete old access logs"
            ON public.vehicle_access_logs
            FOR DELETE
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
        END IF;
    END IF;
END $$;

-- 3. Fix shuttle_activity_logs policies
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shuttle_activity_logs') THEN
        DROP POLICY IF EXISTS "Admins can view shuttle activity logs" ON public.shuttle_activity_logs;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shuttle_activity_logs' AND policyname = 'Admins can view shuttle activity logs') THEN
            CREATE POLICY "Admins can view shuttle activity logs"
            ON public.shuttle_activity_logs
            FOR SELECT
            TO authenticated
            USING (public.has_role(auth.uid(), 'admin'));
        END IF;

        DROP POLICY IF EXISTS "Admins can insert shuttle activity logs" ON public.shuttle_activity_logs;
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shuttle_activity_logs' AND policyname = 'Admins can insert shuttle activity logs') THEN
            CREATE POLICY "Admins can insert shuttle activity logs"
            ON public.shuttle_activity_logs
            FOR INSERT
            TO authenticated
            WITH CHECK (public.has_role(auth.uid(), 'admin'));
        END IF;
    END IF;
END $$;

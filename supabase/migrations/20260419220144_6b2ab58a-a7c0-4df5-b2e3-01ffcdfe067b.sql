-- Create storage bucket for seat layout images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seat-layout-images', 'seat-layout-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Public can view seat layout images"
ON storage.objects FOR SELECT
USING (bucket_id = 'seat-layout-images');

CREATE POLICY "Admins can upload seat layout images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seat-layout-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update seat layout images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'seat-layout-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete seat layout images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seat-layout-images' AND has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for master tables
ALTER TABLE public.depart_times REPLICA IDENTITY FULL;
ALTER TABLE public.rayons REPLICA IDENTITY FULL;
ALTER TABLE public.pickup_points REPLICA IDENTITY FULL;
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.vehicle_types REPLICA IDENTITY FULL;
ALTER TABLE public.shuttle_settings REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.depart_times; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.rayons; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pickup_points; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.services; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_types; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shuttle_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
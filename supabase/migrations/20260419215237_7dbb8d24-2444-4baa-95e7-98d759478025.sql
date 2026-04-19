ALTER TABLE public.seat_layouts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_layouts;
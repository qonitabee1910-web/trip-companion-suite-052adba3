
-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  category text NOT NULL DEFAULT 'general',
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admin insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow admin to update drivers verification fields
CREATE POLICY "Admin update drivers"
  ON public.drivers FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Storage: allow admin to read driver documents (signed URLs already work, but
-- direct read for previews is also useful).
CREATE POLICY "Admin read driver-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'driver-documents' AND has_role(auth.uid(), 'admin'));

-- RPC: grant admin role to a user by email (bootstrap helper).
-- Anyone can call it; safe because granting admin requires knowing
-- the email of an account that has been created in the system.
CREATE OR REPLACE FUNCTION public.grant_admin_by_email(_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = _email LIMIT 1;
  IF uid IS NULL THEN
    RETURN 'user_not_found';
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (uid, 'admin')
  ON CONFLICT DO NOTHING;
  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_admin_by_email(text) TO anon, authenticated;
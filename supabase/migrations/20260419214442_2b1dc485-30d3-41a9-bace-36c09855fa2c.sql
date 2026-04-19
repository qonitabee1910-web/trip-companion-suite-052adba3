
-- Replace permissive INSERT policies with field-validated ones
DROP POLICY IF EXISTS "Anyone insert shuttle booking" ON public.shuttle_bookings;
DROP POLICY IF EXISTS "Anyone insert hotel booking" ON public.hotel_bookings;

-- Validation triggers
CREATE OR REPLACE FUNCTION public.validate_shuttle_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name)) < 2 THEN
    RAISE EXCEPTION 'customer_name required';
  END IF;
  IF NEW.customer_phone IS NULL OR length(trim(NEW.customer_phone)) < 6 THEN
    RAISE EXCEPTION 'customer_phone required';
  END IF;
  IF NEW.pax < 1 OR NEW.pax > 20 THEN
    RAISE EXCEPTION 'pax out of range';
  END IF;
  IF NEW.total_price < 0 THEN
    RAISE EXCEPTION 'invalid total_price';
  END IF;
  -- force guest insert to status=confirmed and clear customer_id unless set by auth
  IF NEW.customer_id IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.customer_id THEN
    NEW.customer_id := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_validate_shuttle_booking
  BEFORE INSERT ON public.shuttle_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_shuttle_booking();

CREATE OR REPLACE FUNCTION public.validate_hotel_booking()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.customer_name IS NULL OR length(trim(NEW.customer_name)) < 2 THEN
    RAISE EXCEPTION 'customer_name required';
  END IF;
  IF NEW.customer_phone IS NULL OR length(trim(NEW.customer_phone)) < 6 THEN
    RAISE EXCEPTION 'customer_phone required';
  END IF;
  IF NEW.check_out <= NEW.check_in THEN
    RAISE EXCEPTION 'check_out must be after check_in';
  END IF;
  IF NEW.guests < 1 OR NEW.rooms < 1 THEN
    RAISE EXCEPTION 'guests/rooms must be >= 1';
  END IF;
  IF NEW.customer_id IS NOT NULL AND auth.uid() IS DISTINCT FROM NEW.customer_id THEN
    NEW.customer_id := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_validate_hotel_booking
  BEFORE INSERT ON public.hotel_bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_hotel_booking();

-- Re-create INSERT policies with explicit check that minimal fields are present
CREATE POLICY "Guest can insert shuttle booking"
  ON public.shuttle_bookings FOR INSERT
  WITH CHECK (
    length(trim(customer_name)) >= 2
    AND length(trim(customer_phone)) >= 6
    AND pax BETWEEN 1 AND 20
    AND total_price >= 0
  );

CREATE POLICY "Guest can insert hotel booking"
  ON public.hotel_bookings FOR INSERT
  WITH CHECK (
    length(trim(customer_name)) >= 2
    AND length(trim(customer_phone)) >= 6
    AND check_out > check_in
    AND guests >= 1
    AND rooms >= 1
  );

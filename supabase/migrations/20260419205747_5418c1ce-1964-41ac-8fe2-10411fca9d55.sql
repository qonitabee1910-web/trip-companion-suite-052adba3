-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'rider');
CREATE TYPE public.ride_status AS ENUM ('pending','accepted','rejected','arriving','in_progress','completed','cancelled');
CREATE TYPE public.shuttle_trip_status AS ENUM ('scheduled','boarding','in_progress','completed','cancelled');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- handle new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.raw_user_meta_data->>'phone')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  plate TEXT,
  rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
  is_online BOOLEAN NOT NULL DEFAULT false,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Drivers row readable by authenticated" ON public.drivers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Driver upsert own row" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND public.has_role(auth.uid(),'driver'));
CREATE POLICY "Driver update own row" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON public.drivers FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- driver_locations
CREATE TABLE public.driver_locations (
  id BIGSERIAL PRIMARY KEY,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_driver_locations_driver_time ON public.driver_locations (driver_id, recorded_at DESC);
ALTER TABLE public.driver_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Driver insert own location" ON public.driver_locations FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY "Driver read own locations" ON public.driver_locations FOR SELECT TO authenticated USING (auth.uid() = driver_id OR public.has_role(auth.uid(),'admin'));

-- rides
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status public.ride_status NOT NULL DEFAULT 'pending',
  pickup_lat DOUBLE PRECISION NOT NULL,
  pickup_lng DOUBLE PRECISION NOT NULL,
  pickup_name TEXT NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  dest_name TEXT NOT NULL,
  ride_type TEXT NOT NULL DEFAULT 'car',
  fare INTEGER NOT NULL DEFAULT 0,
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_rides_status ON public.rides (status);
CREATE INDEX idx_rides_driver ON public.rides (driver_id);
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;

-- Riders see own rides
CREATE POLICY "Rider read own rides" ON public.rides FOR SELECT TO authenticated USING (auth.uid() = rider_id);
CREATE POLICY "Rider insert ride" ON public.rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = rider_id);
CREATE POLICY "Rider cancel own ride" ON public.rides FOR UPDATE TO authenticated USING (auth.uid() = rider_id);

-- Drivers see pending or own rides
CREATE POLICY "Driver read pending or assigned" ON public.rides FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'driver') AND (status = 'pending' OR driver_id = auth.uid())
);
CREATE POLICY "Driver claim/update ride" ON public.rides FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(),'driver') AND (status = 'pending' OR driver_id = auth.uid())
);

-- shuttle_trips
CREATE TABLE public.shuttle_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  rayon_id TEXT NOT NULL,
  vehicle_id TEXT,
  service_tier TEXT NOT NULL DEFAULT 'reguler',
  depart_at TIMESTAMPTZ NOT NULL,
  status public.shuttle_trip_status NOT NULL DEFAULT 'scheduled',
  current_pickup_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shuttle_trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Driver read own shuttle trips" ON public.shuttle_trips FOR SELECT TO authenticated USING (
  driver_id = auth.uid() OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Driver update own shuttle trips" ON public.shuttle_trips FOR UPDATE TO authenticated USING (driver_id = auth.uid());
CREATE POLICY "Admin insert shuttle trip" ON public.shuttle_trips FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Realtime
ALTER TABLE public.rides REPLICA IDENTITY FULL;
ALTER TABLE public.drivers REPLICA IDENTITY FULL;
ALTER TABLE public.shuttle_trips REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shuttle_trips;
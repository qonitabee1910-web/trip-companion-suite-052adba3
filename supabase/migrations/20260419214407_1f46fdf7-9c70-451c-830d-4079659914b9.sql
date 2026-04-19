
-- ============================================================
-- SHUTTLE MASTER DATA
-- ============================================================

CREATE TABLE public.rayons (
  id text PRIMARY KEY,
  name text NOT NULL,
  area text NOT NULL,
  color text NOT NULL DEFAULT 'primary',
  estimate_min int NOT NULL DEFAULT 0,
  surcharge int NOT NULL DEFAULT 0,
  fare_per_km int NOT NULL DEFAULT 1500,
  per_pickup_fare boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pickup_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rayon_id text NOT NULL REFERENCES public.rayons(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  time text NOT NULL DEFAULT '',
  distance_to_next int NOT NULL DEFAULT 0,
  lat double precision,
  lng double precision,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_pickup_points_rayon ON public.pickup_points(rayon_id, sort_order);

CREATE TABLE public.services (
  tier text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  features text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicle_types (
  id text PRIMARY KEY,
  label text NOT NULL,
  vehicle_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  tier_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seat_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id text NOT NULL,
  tier text NOT NULL,
  layout jsonb NOT NULL,
  capacity int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(vehicle_id, tier)
);

CREATE TABLE public.depart_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time text NOT NULL UNIQUE,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE public.shuttle_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SHUTTLE TRANSACTIONAL
-- ============================================================

CREATE TABLE public.shuttle_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  rayon_id text NOT NULL,
  rayon_name text NOT NULL,
  pickup text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  vehicle_id text NOT NULL,
  vehicle_label text NOT NULL,
  service_tier text NOT NULL,
  service_label text NOT NULL,
  seats int[] NOT NULL DEFAULT '{}',
  pax int NOT NULL DEFAULT 1,
  unit_price int NOT NULL DEFAULT 0,
  total_price int NOT NULL DEFAULT 0,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_id uuid,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_shuttle_bookings_date ON public.shuttle_bookings(date, time);
CREATE INDEX idx_shuttle_bookings_phone ON public.shuttle_bookings(customer_phone);

CREATE TABLE public.seat_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  time text NOT NULL,
  rayon_id text NOT NULL,
  vehicle_id text NOT NULL,
  tier text NOT NULL,
  seat_number int NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(date, time, rayon_id, vehicle_id, tier, seat_number)
);
CREATE INDEX idx_seat_blocks_slot ON public.seat_blocks(date, time, rayon_id, vehicle_id, tier);

-- ============================================================
-- HOTEL DATA
-- ============================================================

CREATE TABLE public.hotels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  address text NOT NULL,
  stars int NOT NULL DEFAULT 3,
  rating numeric NOT NULL DEFAULT 0,
  review_count int NOT NULL DEFAULT 0,
  price_per_night int NOT NULL DEFAULT 0,
  original_price int,
  images text[] NOT NULL DEFAULT '{}',
  amenities text[] NOT NULL DEFAULT '{}',
  description text NOT NULL DEFAULT '',
  lat double precision NOT NULL DEFAULT 0,
  lng double precision NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hotels_city ON public.hotels(city) WHERE active;

CREATE TABLE public.room_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity int NOT NULL DEFAULT 2,
  bed text NOT NULL DEFAULT '',
  price int NOT NULL DEFAULT 0,
  breakfast boolean NOT NULL DEFAULT false,
  refundable boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);
CREATE INDEX idx_room_types_hotel ON public.room_types(hotel_id, sort_order);

CREATE TABLE public.hotel_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  hotel_id uuid NOT NULL,
  hotel_name text NOT NULL,
  room_type_id uuid,
  room_name text NOT NULL,
  check_in date NOT NULL,
  check_out date NOT NULL,
  guests int NOT NULL DEFAULT 1,
  rooms int NOT NULL DEFAULT 1,
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_id uuid,
  total_price int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hotel_bookings_phone ON public.hotel_bookings(customer_phone);

-- ============================================================
-- TRIGGERS — updated_at
-- ============================================================
CREATE TRIGGER tg_rayons_updated BEFORE UPDATE ON public.rayons
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_services_updated BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_vehicle_types_updated BEFORE UPDATE ON public.vehicle_types
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_seat_layouts_updated BEFORE UPDATE ON public.seat_layouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_shuttle_settings_updated BEFORE UPDATE ON public.shuttle_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
CREATE TRIGGER tg_hotels_updated BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.rayons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depart_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shuttle_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shuttle_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Master data: public SELECT, admin write
DO $$
DECLARE
  t text;
  master_tables text[] := ARRAY['rayons','pickup_points','services','vehicle_types','seat_layouts','depart_times','shuttle_settings','hotels','room_types','seat_blocks'];
BEGIN
  FOREACH t IN ARRAY master_tables LOOP
    EXECUTE format('CREATE POLICY "Public can read %I" ON public.%I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "Admin insert %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), ''admin''))', t, t);
    EXECUTE format('CREATE POLICY "Admin update %I" ON public.%I FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t, t);
    EXECUTE format('CREATE POLICY "Admin delete %I" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t, t);
  END LOOP;
END $$;

-- shuttle_bookings: public INSERT (guest checkout), admin SELECT all, customer SELECT own
CREATE POLICY "Anyone insert shuttle booking" ON public.shuttle_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read shuttle bookings" ON public.shuttle_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customer read own shuttle bookings" ON public.shuttle_bookings FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Admin update shuttle bookings" ON public.shuttle_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete shuttle bookings" ON public.shuttle_bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- hotel_bookings: same pattern
CREATE POLICY "Anyone insert hotel booking" ON public.hotel_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin read hotel bookings" ON public.hotel_bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Customer read own hotel bookings" ON public.hotel_bookings FOR SELECT TO authenticated USING (customer_id = auth.uid());
CREATE POLICY "Admin update hotel bookings" ON public.hotel_bookings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin delete hotel bookings" ON public.hotel_bookings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- SEED DATA
-- ============================================================

-- Rayons
INSERT INTO public.rayons (id, name, area, color, estimate_min, sort_order) VALUES
  ('A','Rayon A','Medan Pusat','primary',134,1),
  ('B','Rayon B','Medan Barat','accent',145,2),
  ('C','Rayon C','Medan Timur','success',90,3),
  ('D','Rayon D','Medan Polonia','warning',152,4);

-- Pickup points (only Rayon A & C as representative seed; admin can add more via UI)
INSERT INTO public.pickup_points (rayon_id, code, name, time, distance_to_next, lat, lng, sort_order) VALUES
  ('A','J1','Hermes Palace','06:00',700,3.5752,98.6722,1),
  ('A','J2','Kama Hotel','06:05',950,3.5790,98.6760,2),
  ('A','J3','Travel Suite','06:10',190,3.5840,98.6820,3),
  ('A','J4','RS Columbia Asia','06:12',110,3.5852,98.6830,4),
  ('A','J5','Selecta','06:14',400,3.5860,98.6838,5),
  ('A','J6','Danau Toba','06:19',950,3.5885,98.6865,6),
  ('A','J7','LePolonia','06:23',2000,3.5810,98.6830,7),
  ('A','J8','Istana Maimun','06:31',450,3.5752,98.6837,8),
  ('A','J9','Mesjid Raya','06:34',4100,3.5755,98.6878,9),
  ('A','J10','Grand Antarez','06:46',2100,3.5520,98.7000,10),
  ('A','J11','Antares','06:53',7100,3.5400,98.7100,11),
  ('A','J12','Simp. Marendal Aroma','07:16',3400,3.5050,98.7150,12),
  ('A','J13','RM Khas Mandailing','07:26',4800,3.4850,98.7250,13),
  ('A','J14','Simp. Amplas','07:39',31000,3.4650,98.7400,14),
  ('A','DEST','KNO','08:14',0,3.6422,98.8853,15),
  ('B','J1','Cambridge','06:00',1400,3.5912,98.6770,1),
  ('B','J2','Swiss Bellin Gajah','06:05',750,3.5980,98.6720,2),
  ('B','J3','Grand Darussalam','06:08',160,3.6010,98.6700,3),
  ('B','J4','Sulthan Hotel','06:10',160,3.6015,98.6695,4),
  ('B','J5','Grand Kanaya','06:12',450,3.6025,98.6685,5),
  ('B','J6','Four Point','06:15',3600,3.6050,98.6650,6),
  ('B','J7','Manhattan','06:25',750,3.5870,98.6680,7),
  ('B','DEST','KNO','08:25',0,3.6422,98.8853,99),
  ('C','J1','Adi Mulia','06:00',450,3.5840,98.6750,1),
  ('C','J2','Santika','06:03',240,3.5860,98.6770,2),
  ('C','J3','Arya Duta','06:05',230,3.5875,98.6785,3),
  ('C','J4','Aston Grand City Hall','06:08',130,3.5890,98.6800,4),
  ('C','J5','Grand Inna','06:10',450,3.5895,98.6810,5),
  ('C','J6','Reiz Suite Artotel','06:13',700,3.5910,98.6840,6),
  ('C','J7','Podomoro','06:18',750,3.5950,98.6890,7),
  ('C','DEST','Tol KNO','07:30',0,3.6422,98.8853,99),
  ('D','J1','Hotel TD Pardede','06:00',2400,3.5780,98.6680,1),
  ('D','J2','Hermes Palace','06:10',3500,3.5752,98.6722,2),
  ('D','J3','Ibis Styles','06:21',850,3.5830,98.6790,3),
  ('D','DEST','Kualanamu','08:32',0,3.6422,98.8853,99);

-- Services
INSERT INTO public.services (tier, label, description, price_multiplier, features, sort_order) VALUES
  ('reguler','Reguler','Pilihan ekonomis untuk perjalanan nyaman.',1.0,
    ARRAY['AC dingin','Air mineral','Asuransi penumpang'],1),
  ('semi-executive','Semi Executive','Lebih lapang dengan fasilitas tambahan.',1.4,
    ARRAY['AC dingin','Reclining seat','Snack ringan','WiFi onboard','USB charger'],2),
  ('executive','Executive','Pengalaman premium menuju bandara.',1.8,
    ARRAY['Captain seat','Snack box','Selimut & bantal','WiFi cepat','USB charger','Free luggage 25kg'],3);

-- Vehicle types
INSERT INTO public.vehicle_types (id, label, vehicle_name, description, tier_prices, sort_order) VALUES
  ('hiace','HiAce','HiAce Premium','Kapasitas besar, cocok rombongan keluarga.',
    '{"reguler":120000,"semi-executive":160000,"executive":220000}'::jsonb,1),
  ('suv','SUV','Premio','Lebih privat, ruang kabin luas.',
    '{"reguler":180000,"semi-executive":230000,"executive":300000}'::jsonb,2),
  ('minicar','Mini Car','Elf Mini','Hemat untuk solo & pasangan.',
    '{"reguler":95000,"semi-executive":130000,"executive":175000}'::jsonb,3);

-- Depart times
INSERT INTO public.depart_times (time, sort_order) VALUES
  ('04:00',1),('06:00',2),('09:00',3),('12:00',4),('15:00',5),('18:00',6),('21:00',7);

-- Settings
INSERT INTO public.shuttle_settings (key, value) VALUES
  ('destination','{"code":"KNO","name":"Kualanamu International Airport","short":"KNO Airport"}'::jsonb),
  ('content','{"heroTitle":"Shuttle ke KNO","heroSubtitle":"Pilih rayon keberangkatanmu","footerNote":"Cara pesan: pilih rayon → tentukan titik jemput & jam → pilih kelas service → pilih kendaraan → pilih kursi.","paxMax":12}'::jsonb);

-- Hotels
WITH ins AS (
  INSERT INTO public.hotels (name, city, address, stars, rating, review_count, price_per_night, original_price, images, amenities, description, lat, lng, sort_order) VALUES
    ('Bali Sunset Resort & Spa','Bali','Jl. Pantai Seminyak No. 12, Seminyak',5,4.8,1284,850000,1200000,
      ARRAY['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200','https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200','https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200'],
      ARRAY['WiFi Gratis','Kolam Renang','Sarapan','Parkir','AC','Spa'],
      'Resort tepi pantai eksklusif dengan pemandangan sunset Seminyak.',-8.6905,115.1729,1),
    ('Yogya Heritage Hotel','Yogyakarta','Jl. Malioboro No. 45, Yogyakarta',4,4.6,892,420000,580000,
      ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200','https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200'],
      ARRAY['WiFi Gratis','Sarapan','Parkir','AC'],
      'Hotel butik bergaya kolonial Jawa di jantung Malioboro.',-7.7956,110.3695,2),
    ('Bandung Highland Inn','Bandung','Jl. Raya Lembang KM 15, Bandung',4,4.7,654,560000,NULL,
      ARRAY['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'],
      ARRAY['WiFi Gratis','Sarapan','Parkir','Pemandangan Gunung'],
      'Hotel pegunungan dengan udara sejuk dan view kebun teh.',-6.8118,107.6186,3),
    ('Jakarta Skyline Suite','Jakarta','Jl. Jend. Sudirman Kav 52, Jakarta',5,4.9,2105,1250000,1650000,
      ARRAY['https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200','https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200'],
      ARRAY['WiFi Gratis','Kolam Renang','Sarapan','Gym','AC','Spa','Bar'],
      'Hotel mewah di pusat bisnis Sudirman.',-6.2088,106.8221,4),
    ('Surabaya Business Hotel','Surabaya','Jl. Tunjungan No. 88, Surabaya',4,4.5,478,480000,NULL,
      ARRAY['https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200'],
      ARRAY['WiFi Gratis','Sarapan','Gym','AC'],
      'Hotel bisnis di pusat kota Surabaya.',-7.2575,112.7521,5),
    ('Bali Cozy Homestay','Bali','Jl. Hanoman, Ubud',3,4.4,312,280000,NULL,
      ARRAY['https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200'],
      ARRAY['WiFi Gratis','Sarapan','Parkir'],
      'Homestay nyaman di tengah Ubud.',-8.5069,115.2625,6)
  RETURNING id, name
)
INSERT INTO public.room_types (hotel_id, name, capacity, bed, price, breakfast, refundable, sort_order)
SELECT ins.id, r.name, r.capacity, r.bed, r.price, r.breakfast, r.refundable, r.sort_order
FROM ins
JOIN (VALUES
  ('Bali Sunset Resort & Spa','Deluxe Room',2,'1 Queen',850000,true,true,1),
  ('Bali Sunset Resort & Spa','Ocean Suite',3,'1 King',1450000,true,true,2),
  ('Yogya Heritage Hotel','Standard Room',2,'1 Double',420000,true,false,1),
  ('Yogya Heritage Hotel','Family Room',4,'2 Double',720000,true,true,2),
  ('Bandung Highland Inn','Mountain View Room',2,'1 Queen',560000,true,true,1),
  ('Jakarta Skyline Suite','Executive Suite',2,'1 King',1250000,true,true,1),
  ('Jakarta Skyline Suite','Presidential Suite',4,'1 King + 2 Single',3500000,true,true,2),
  ('Surabaya Business Hotel','Superior Room',2,'1 Queen',480000,true,true,1),
  ('Bali Cozy Homestay','Standard Room',2,'1 Double',280000,true,false,1)
) AS r(hotel_name, name, capacity, bed, price, breakfast, refundable, sort_order)
ON ins.name = r.hotel_name;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shuttle_bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seat_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rayons;

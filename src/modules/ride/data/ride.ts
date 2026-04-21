export interface POI {
  name: string;
  lat: number;
  lng: number;
  area: string;
}

export interface RideOption {
  id: string;
  name: string;
  description: string;
  capacity: number;
  pricePerKm: number;
  basePrice: number;
  etaMin: number;
  icon: "bike" | "car" | "carxl";
}

export const POIS: POI[] = [
  {
    name: "Plaza Indonesia",
    lat: -6.1937,
    lng: 106.823,
    area: "Jakarta Pusat",
  },
  {
    name: "Grand Indonesia",
    lat: -6.1953,
    lng: 106.821,
    area: "Jakarta Pusat",
  },
  {
    name: "Stasiun Gambir",
    lat: -6.1768,
    lng: 106.8307,
    area: "Jakarta Pusat",
  },
  {
    name: "Bandara Soekarno-Hatta",
    lat: -6.1256,
    lng: 106.6559,
    area: "Tangerang",
  },
  {
    name: "Mall Kelapa Gading",
    lat: -6.1572,
    lng: 106.9067,
    area: "Jakarta Utara",
  },
  {
    name: "Senayan City",
    lat: -6.2257,
    lng: 106.7995,
    area: "Jakarta Selatan",
  },
  {
    name: "Pondok Indah Mall",
    lat: -6.2658,
    lng: 106.7848,
    area: "Jakarta Selatan",
  },
  { name: "Kota Tua", lat: -6.1352, lng: 106.8133, area: "Jakarta Barat" },
  { name: "Monas", lat: -6.1754, lng: 106.8272, area: "Jakarta Pusat" },
  {
    name: "Stasiun Manggarai",
    lat: -6.2105,
    lng: 106.8504,
    area: "Jakarta Selatan",
  },
];

export const DEFAULT_LOCATION = { lat: -6.1937, lng: 106.823 }; // Plaza Indonesia

export const RIDE_OPTIONS: RideOption[] = [
  {
    id: "bike",
    name: "Ride Bike",
    description: "Cepat & murah, cocok untuk solo",
    capacity: 1,
    pricePerKm: 2500,
    basePrice: 8000,
    etaMin: 3,
    icon: "bike",
  },
  {
    id: "car",
    name: "Ride Car",
    description: "Nyaman, AC, hingga 4 orang",
    capacity: 4,
    pricePerKm: 4500,
    basePrice: 12000,
    etaMin: 5,
    icon: "car",
  },
  {
    id: "carxl",
    name: "Ride Car XL",
    description: "Mobil besar, hingga 6 orang",
    capacity: 6,
    pricePerKm: 6500,
    basePrice: 18000,
    etaMin: 7,
    icon: "carxl",
  },
];

export const DRIVERS = [
  {
    name: "Budi Santoso",
    plate: "B 1234 ABC",
    rating: 4.9,
    photo: "https://i.pravatar.cc/100?img=12",
    trips: 1284,
  },
  {
    name: "Andi Wijaya",
    plate: "B 5678 XYZ",
    rating: 4.8,
    photo: "https://i.pravatar.cc/100?img=33",
    trips: 892,
  },
  {
    name: "Siti Rahayu",
    plate: "B 9012 DEF",
    rating: 5.0,
    photo: "https://i.pravatar.cc/100?img=45",
    trips: 2105,
  },
];

// Haversine distance in km
export const distanceKm = (
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

// Get icon emoji for ride type
export const getRideIcon = (rideType: string): string => {
  switch (rideType) {
    case "bike":
      return "🏍️";
    case "car":
      return "🚗";
    case "carxl":
      return "🚙";
    default:
      return "🚗";
  }
};

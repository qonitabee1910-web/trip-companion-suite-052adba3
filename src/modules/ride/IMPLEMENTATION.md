# On-Demand Ride Feature - Implementation Guide

## Feature Overview
Complete on-demand ride booking system for PYU-GO with real-time driver tracking, location selection, and trip lifecycle management.

## Screens Implemented

### 1. **Search Screen** (Initial)
- Location input for pickup and dropoff
- Current location integration (GPS)
- Location history with recent pickups
- Route summary
- Ride type selection button

### 2. **Ride Type Selection**
- Display all available ride types (Bike, Car, Car XL)
- Show fare calculation per ride type
- ETA estimates
- Capacity indicators
- Real-time distance and fare updates

### 3. **Ride Confirmation Sheet**
- Route summary with map points
- Vehicle details and description
- Price breakdown
- Warning about dynamic pricing
- Confirm/Cancel actions
- Loading state during booking

### 4. **Driver Searching Screen**
- Animated searching state
- Real-time driver assignment from Supabase
- Driver info card when matched:
  - Driver name, rating, trip count
  - License plate
  - Contact options (call, chat)
  - ETA to pickup location
- Cancel ride option

### 5. **Trip Ongoing Screen**
- Driver information with photo
- Real-time ETA updates
- Route summary (pickup → dropoff)
- Contact driver buttons
- Emergency alert section
- Fare information display

### 6. **Trip Completed Screen**
- Trip summary (distance, duration, route)
- Driver rating interface (1-5 stars)
- Optional comment field
- Payment method display
- Receipt summary

## Architecture

### File Structure
```
src/modules/ride/
├── pages/
│   └── RideHome.tsx (Main orchestration component)
├── components/
│   ├── LocationPicker.tsx
│   ├── RideConfirmationSheet.tsx
│   ├── DriverSearchingScreen.tsx
│   ├── TripOngoingScreen.tsx
│   └── TripCompletedScreen.tsx
├── hooks/
│   ├── useLiveDriverPosition.ts (Real-time driver tracking)
│   └── useRideRequest.ts (Ride lifecycle state management)
├── services/
│   └── rideService.ts (Supabase integration)
├── data/
│   └── ride.ts (POIs, vehicle options, demo data)
└── index.ts (Module manifest)
```

## State Management

### `useRideRequest()` Hook
Manages the complete ride lifecycle:
- `requestRide()` - Create new ride request in Supabase
- `loadRide(rideId)` - Load existing ride
- `cancel()` - Cancel active ride
- `reset()` - Clear state
- Real-time subscription to ride status updates

**Ride Stages:**
- `idle` - No active ride
- `pending` - Awaiting driver acceptance
- `accepted` - Driver assigned
- `arriving` - Driver on way to pickup
- `in_progress` - Trip started
- `completed` - Trip finished
- `cancelled` - Ride cancelled

### `useLiveDriverPosition(driverId)` Hook
Real-time driver location tracking:
- Subscribes to driver position updates in Supabase
- Returns `{ lat, lng, updatedAt }` or null
- Auto-cleanup on component unmount
- Fallback animation if no live driver found

## Supabase Integration

### Rides Table Schema
```sql
CREATE TABLE rides (
  id UUID PRIMARY KEY
  rider_id UUID (foreign key to users)
  driver_id UUID (foreign key to drivers)
  status ride_status enum
  pickup_lat, pickup_lng, pickup_name
  dest_lat, dest_lng, dest_name
  ride_type TEXT
  fare INTEGER
  distance_km NUMERIC
  requested_at TIMESTAMPTZ
  accepted_at, started_at, completed_at TIMESTAMPTZ
)
```

### RLS Policies
- **Riders**: Can view/create own rides, cancel own rides
- **Drivers**: Can view pending rides or assigned rides, can update assigned rides
- **Real-time**: Enabled for all tables with REPLICA IDENTITY FULL

### Real-time Features
1. **Ride Status Updates** - Subscribe to `rides` table for status changes
2. **Driver Position Tracking** - Subscribe to `drivers` table for position updates
3. **Automatic Sync** - Components update instantly when Supabase data changes

## Component API Reference

### LocationPicker
```tsx
<LocationPicker
  open={boolean}
  onClose={() => void}
  onSelect={(location: POI) => void}
  title={string}
  showCurrentLocation={boolean}
  onCurrentLocation={() => void}
/>
```

### RideConfirmationSheet
```tsx
<RideConfirmationSheet
  open={boolean}
  onClose={() => void}
  onConfirm={() => void}
  pickup={{ name: string; distance?: string }}
  dropoff={{ name: string }}
  selectedRide={RideOption}
  fare={number}
  distance={number}
  eta={number}
  loading={boolean}
/>
```

### DriverSearchingScreen
```tsx
<DriverSearchingScreen
  open={boolean}
  onClose={() => void}
  driver={Driver | null}
  searching={boolean}
  eta={number}
/>
```

### TripOngoingScreen
```tsx
<TripOngoingScreen
  open={boolean}
  driverName={string}
  driverPhoto={string}
  plate={string}
  eta={number}
  pickupName={string}
  dropoffName={string}
  totalFare={number}
/>
```

### TripCompletedScreen
```tsx
<TripCompletedScreen
  open={boolean}
  onClose={() => void}
  driverName={string}
  driverPhoto={string}
  totalFare={number}
  duration={number}
  distance={number}
  pickupName={string}
  dropoffName={string}
  onRateDriver={(rating, comment) => void}
  isSubmitting={boolean}
/>
```

## Key Features

### 1. **Real-time Driver Tracking**
- Live position updates from Supabase
- Fallback animation when no live driver
- Auto-fit map bounds to show route and driver

### 2. **Fare Calculation**
```
fare = basePrice + (pricePerKm × distance)
```
- Per-vehicle calculation
- Real-time updates as route changes
- Displayed in multiple places (summary cards, confirmation, receipts)

### 3. **Location Management**
- 10 predefined POIs (malls, stations, landmarks in Jakarta)
- Recent locations saved to localStorage
- GPS geolocation for current position
- POI search/filter

### 4. **Payment Flow**
- Cash payment to driver (current implementation)
- Future: Digital wallet integration
- Receipt display after trip completion

### 5. **Driver Rating**
- 1-5 star rating system
- Optional comment field
- Post-trip feedback collection

## Demo Data

### Ride Options
1. **Ride Bike** - Solo, fast, affordable (Rp 2,500/km + Rp 8,000 base)
2. **Ride Car** - Comfortable, AC, 4 passengers (Rp 4,500/km + Rp 12,000 base)
3. **Ride Car XL** - Large, 6 passengers (Rp 6,500/km + Rp 18,000 base)

### POIs
- Plaza Indonesia, Grand Indonesia, Stasiun Gambir
- Bandara Soekarno-Hatta
- Mall Kelapa Gading, Senayan City, Pondok Indah Mall
- Kota Tua, Monas, Stasiun Manggarai

### Demo Drivers
- Budi Santoso (Rating: 4.9, 1,284 trips)
- Andi Wijaya (Rating: 4.8, 892 trips)
- Siti Rahayu (Rating: 5.0, 2,105 trips)

## UI/UX Highlights

### Map-First Design
- Full-screen Leaflet/OSM map
- Markers for pickup (blue circle), dropoff (orange square), driver (dark label)
- Dashed route polyline showing trip path
- Auto-fit bounds to show entire route

### Bottom Sheet Navigation
- Smooth transitions between screens
- No full page reloads
- Context preserved during navigation

### Real-time Indicators
- "LIVE" badge for real driver tracking
- Animated pulse for searching state
- Smooth position animations

### Accessibility
- Login requirement with clear messaging
- Error handling for geolocation failures
- Fallback UI when services unavailable

## Testing Checklist

- [x] Build without errors (Exit Code 0)
- [ ] Test location picker with search
- [ ] Test ride type selection and fare calculation
- [ ] Test ride request creation (Supabase)
- [ ] Test real-time driver tracking
- [ ] Test trip lifecycle (pending → accepted → ongoing → completed)
- [ ] Test driver rating submission
- [ ] Test cancel ride functionality
- [ ] Test GPS geolocation permission flows
- [ ] Test with no drivers available scenario

## Future Enhancements

1. **Digital Payments**
   - E-wallet integration
   - Credit/debit card support
   - Payment verification before trip start

2. **Advanced Features**
   - Ride scheduling
   - Multiple stops
   - Shared rides (carpooling)
   - Promo codes and discounts

3. **Driver Features**
   - Driver app with navigation
   - Automatic position tracking
   - Trip acceptance interface

4. **Safety Features**
   - Emergency contact sharing
   - Trip sharing with contacts
   - Incident reporting
   - Driver verification

5. **Analytics**
   - Trip history
   - Spending statistics
   - Driver ratings history
   - Favorite locations

## Deployment Notes

1. **Environment Variables**
   - Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set

2. **Supabase Configuration**
   - Enable realtime for `rides` and `drivers` tables
   - Set proper RLS policies
   - Create indexes on frequently queried columns

3. **Browser Support**
   - Requires Geolocation API support
   - Requires modern browser for Leaflet maps
   - WebSocket support for real-time features

## Files Modified/Created

### New Files
- `services/rideService.ts` - Supabase integration
- `hooks/useRideRequest.ts` - Ride state management
- `components/LocationPicker.tsx` - Location selection UI
- `components/RideConfirmationSheet.tsx` - Confirmation UI
- `components/DriverSearchingScreen.tsx` - Driver search UI
- `components/TripOngoingScreen.tsx` - Active trip UI
- `components/TripCompletedScreen.tsx` - Trip summary & rating

### Modified Files
- `pages/RideHome.tsx` - Complete rewrite with Supabase integration

### Unchanged
- `data/ride.ts` - POI and vehicle data
- `hooks/useLiveDriverPosition.ts` - Live driver tracking
- `index.ts` - Module manifest

---

**Build Status**: ✅ Success (Exit Code: 0)
**Last Updated**: April 21, 2026

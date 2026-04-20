# Geocoding Feature Documentation

**Module**: Ride  
**Feature**: Geocoding (Address ↔ Coordinates conversion)  
**Date**: April 21, 2026  
**Status**: ✅ Implemented

---

## Overview

The geocoding feature enables the ride module to convert between addresses and geographic coordinates using OpenStreetMap's Nominatim API. This provides:

- **Forward Geocoding**: Convert addresses to coordinates (e.g., "Plaza Indonesia" → `-6.1937, 106.8230`)
- **Reverse Geocoding**: Convert coordinates to addresses (e.g., `-6.1937, 106.8230` → detailed address)
- **Autocomplete**: Real-time address search suggestions
- **Location Details**: Nearby landmarks, neighborhoods, cities

---

## Architecture

### Components

```
Geocoding Feature
├── Services
│   ├── geocodingService.ts (Core API integration)
│   └── geocodingUtils.ts (Helper functions)
├── Hooks
│   └── useGeocoding.ts (React hooks)
├── Components
│   ├── LocationPicker.tsx (Enhanced with geocoding)
│   └── GeocodeInfoDisplay.tsx (Display geocoding results)
└── Documentation
    └── GEOCODING.md (This file)
```

### Data Flow

```
User Input
    ↓
useGeocodeAutocomplete Hook (debounced)
    ↓
geocodingService.ts (API call to Nominatim)
    ↓
Cache (24-hour persistence)
    ↓
Component State Update
    ↓
UI Display
```

---

## Services

### `geocodingService.ts`

Core service providing direct geocoding functions:

#### Functions

##### `reverseGeocode(lat, lng): Promise<ReverseGeocodeResult>`
Convert coordinates to address.

```typescript
const result = await reverseGeocode(-6.1937, 106.8230);
// Returns: {
//   address: "Plaza Indonesia, Jakarta Pusat, Jakarta, Indonesia",
//   name: "Plaza Indonesia",
//   city: "Jakarta",
//   country: "Indonesia"
// }
```

##### `forwardGeocode(address): Promise<GeocodeResult[]>`
Convert address to coordinates.

```typescript
const results = await forwardGeocode("Plaza Indonesia");
// Returns: [{
//   name: "Plaza Indonesia",
//   address: "Plaza Indonesia, Jakarta Pusat, ...",
//   lat: -6.1937,
//   lng: 106.8230
// }]
```

##### `geocodeAutocomplete(query): Promise<GeocodeResult[]>`
Get autocomplete suggestions.

```typescript
const results = await geocodeAutocomplete("Plaza");
// Returns array of matching locations with coordinates
```

##### `getDetailedLocation(lat, lng): Promise<DetailedLocation>`
Get detailed location with nearby landmarks.

```typescript
const details = await getDetailedLocation(-6.1937, 106.8230);
// Returns: {
//   address: "...",
//   landmark: "Plaza Indonesia",
//   neighborhood: "Jakarta Pusat",
//   city: "Jakarta"
// }
```

#### Caching

- **Duration**: 24 hours
- **Scope**: Automatic cleanup of expired entries
- **Access**: Use `getCacheStats()` for statistics, `clearGeocodingCache()` to clear

---

## Hooks

### `useGeocoding.ts`

React hooks for component integration:

#### `useReverseGeocode()`

```typescript
const { loading, error, result, geocode } = useReverseGeocode();

// Usage
const handleMapClick = (lat, lng) => {
  geocode(lat, lng); // Returns ReverseGeocodeResult
};
```

**State:**
- `loading`: boolean - API call in progress
- `error`: string | null - Error message if failed
- `result`: ReverseGeocodeResult | null - Geocoding result
- `geocode`: function - Trigger reverse geocoding

---

#### `useForwardGeocode()`

```typescript
const { loading, error, results, geocode } = useForwardGeocode();

// Usage
const handleSearch = (address) => {
  geocode(address); // Returns GeocodeResult[]
};
```

**State:**
- `loading`: boolean - API call in progress
- `error`: string | null - Error message if failed
- `results`: GeocodeResult[] | null - Array of matching locations
- `geocode`: function - Trigger forward geocoding

---

#### `useGeocodeAutocomplete(debounceMs?)`

Debounced autocomplete hook (300ms default).

```typescript
const { loading, error, results, search, cleanup } = useGeocodeAutocomplete();

// Usage in input onChange
const handleInputChange = (e) => {
  search(e.target.value); // Debounced autocomplete
};

// Cleanup on unmount
useEffect(() => {
  return () => cleanup();
}, [cleanup]);
```

**State:**
- `loading`: boolean - Debounced search in progress
- `error`: string | null - Error message if failed
- `results`: GeocodeResult[] | null - Array of suggestions
- `search`: function - Trigger debounced search
- `cleanup`: function - Cancel pending searches

---

#### `useDetailedLocation()`

```typescript
const { loading, error, location, fetchLocation } = useDetailedLocation();

// Usage
const handleMarkerClick = (lat, lng) => {
  fetchLocation(lat, lng); // Returns detailed location info
};
```

---

## Components

### `LocationPicker.tsx` (Enhanced)

The location picker now includes geocoding capabilities:

**Features:**
- Address search with autocomplete
- Recent locations saved to localStorage
- Built-in POI database fallback
- Real-time loading indicators
- Error handling and user feedback

**Props:**
```typescript
interface LocationPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (location: POI) => void;
  title: string;
  showCurrentLocation?: boolean;
  onCurrentLocation?: () => void;
}
```

**Usage:**
```typescript
<LocationPicker
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onSelect={(location) => console.log(location)}
  title="Pilih Lokasi"
  showCurrentLocation={true}
  onCurrentLocation={handleCurrentLocation}
/>
```

---

### `GeocodeInfoDisplay.tsx`

Display geocoding results:

#### Component 1: `GeocodeInfoDisplay`

```typescript
<GeocodeInfoDisplay
  address="Plaza Indonesia, Jakarta..."
  landmark="Plaza Indonesia"
  neighborhood="Jakarta Pusat"
  city="Jakarta"
  loading={false}
  compact={false}
/>
```

**Props:**
- `address`: Full address string
- `landmark`: Nearby landmark/POI
- `neighborhood`: Neighborhood/area
- `city`: City name
- `loading`: Show loading state
- `compact`: True for compact display mode
- `className`: Additional CSS classes

#### Component 2: `GeocodeResultsList`

```typescript
<GeocodeResultsList
  results={results}
  loading={loading}
  onSelect={(result) => handleSelect(result)}
/>
```

---

## Utilities

### `geocodingUtils.ts`

Helper functions for common tasks:

```typescript
// Convert geocoding result to POI format
const poi = geocodeResultToPOI("Plaza Indonesia", "address...", lat, lng, "Jakarta");

// Enhance existing POI with geocoding details
const enriched = await enhancePOIWithGeocoding(poi);

// Search addresses and get POI array
const results = await searchAddressesToPOIs("Plaza Indonesia");

// Find nearest POI from coordinates
const nearest = findNearestPOI(userLat, userLng, poiArray);

// Calculate distance between coordinates
const km = calculateDistance(lat1, lng1, lat2, lng2);

// User location preferences
saveUserLocationPreference(lat, lng, "Home");
const pref = getUserLocationPreference();

// Geofence checking
const violates = checkGeofenceViolation(userLat, userLng, routeLat, routeLng, 1);

// Format address for display
const formatted = formatAddressForDisplay(longAddress, 50);

// Extract address components
const { street, area, city, country } = extractAddressComponents(address);
```

---

## Usage Examples

### Example 1: Search for Location

```typescript
import { useGeocodeAutocomplete } from "@/modules/ride/hooks/useGeocoding";

function LocationSearch() {
  const { results, loading, search } = useGeocodeAutocomplete();

  return (
    <div>
      <input
        onChange={(e) => search(e.target.value)}
        placeholder="Search address..."
      />
      {loading && <p>Searching...</p>}
      {results?.map((result) => (
        <div key={result.name}>
          <p>{result.name}</p>
          <p>{result.address}</p>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Show Location Details

```typescript
import { useDetailedLocation } from "@/modules/ride/hooks/useGeocoding";
import { GeocodeInfoDisplay } from "@/modules/ride/components/GeocodeInfoDisplay";

function MapMarker({ lat, lng }) {
  const { location, loading } = useDetailedLocation();

  return (
    <>
      <MapMarker
        position={[lat, lng]}
        onClick={() => fetchLocation(lat, lng)}
      />
      <GeocodeInfoDisplay
        address={location?.address}
        landmark={location?.landmark}
        city={location?.city}
        loading={loading}
      />
    </>
  );
}
```

### Example 3: Convert to POI

```typescript
import { geocodeResultToPOI } from "@/modules/ride/services/geocodingUtils";

function CreateCustomLocation() {
  const poi = geocodeResultToPOI(
    "My Home",
    "Jl. Sudirman No. 1, Jakarta Pusat, Jakarta",
    -6.1937,
    106.8230,
    "Jakarta Pusat"
  );

  return <LocationCard poi={poi} />;
}
```

---

## Performance Considerations

### Caching Strategy
- **24-hour TTL** for all geocoding results
- **Automatic cleanup** of expired entries
- **Check cache first** before API calls

### API Rate Limiting
- Nominatim allows **1 request per second**
- **Debouncing** on autocomplete (300ms) prevents throttling
- **Errors gracefully degrade** to cached or built-in POIs

### Optimization Tips

1. **Use debounced autocomplete** for user input
2. **Cache results** for frequently accessed locations
3. **Batch reverse geocoding** for multiple markers
4. **Use compact display mode** for map popups
5. **Lazy load** geocoding details when needed

---

## Error Handling

All functions handle errors gracefully:

```typescript
try {
  const result = await reverseGeocode(lat, lng);
  if (!result) {
    // API returned no result
    // Use POI database fallback or cached location
  }
} catch (error) {
  // Network error or timeout
  // Use cached data or show error to user
  console.error("Geocoding error:", error);
}
```

---

## API Details

### Nominatim API

- **Base URL**: `https://nominatim.openstreetmap.org`
- **Authentication**: None required
- **Rate Limit**: 1 request/second
- **Language**: Indonesian (id-ID)
- **Response Format**: JSON

### Endpoints Used

- `/reverse` - Reverse geocoding (coordinates → address)
- `/search` - Forward geocoding (address → coordinates)

---

## Browser Compatibility

Geocoding works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Requires HTTPS or localhost

---

## Testing Checklist

- [ ] Reverse geocoding coordinates to address
- [ ] Forward geocoding address to coordinates
- [ ] Autocomplete suggestions with typing
- [ ] Cache persistence across page reloads
- [ ] Error handling for invalid inputs
- [ ] Error handling for API failures
- [ ] Display detailed location info
- [ ] User location preferences saved/loaded
- [ ] Geofence violation detection
- [ ] Distance calculation accuracy

---

## Future Enhancements

1. **Multiple Geocoding Providers**
   - Fallback to Google Maps API if Nominatim unavailable
   - Support for different geocoding services

2. **Advanced Features**
   - Geocoding with real-time traffic consideration
   - Location favoriting with custom names
   - Location sharing between users

3. **Performance**
   - Server-side caching for frequently requested locations
   - Spatial indexing for faster POI lookup
   - Background geocoding updates

4. **Analytics**
   - Track geocoding API performance
   - Monitor cache hit rates
   - Analyze user search patterns

---

## Troubleshooting

**Issue**: Autocomplete returns no results  
**Solution**: Check internet connection, verify address spelling, try more specific queries

**Issue**: Reverse geocoding returns empty address  
**Solution**: Coordinates may be in unpopulated area, use nearby POI from cache

**Issue**: Cache grows too large  
**Solution**: Cache auto-expires after 24 hours; call `clearGeocodingCache()` manually if needed

**Issue**: API rate limit exceeded  
**Solution**: Debouncing is enabled by default; ensure using `useGeocodeAutocomplete` for user input

---

## File Structure

```
src/modules/ride/
├── services/
│   ├── geocodingService.ts      # Core API integration
│   └── geocodingUtils.ts        # Helper utilities
├── hooks/
│   └── useGeocoding.ts          # React hooks
├── components/
│   ├── LocationPicker.tsx       # Enhanced picker
│   └── GeocodeInfoDisplay.tsx   # Result display
└── GEOCODING.md                 # This documentation
```

---

## Maintenance

### Regular Tasks
- Monitor Nominatim API status
- Review cache hit rates monthly
- Update POI database quarterly
- Test geocoding with new addresses

### Updates
- Check Nominatim documentation for API changes
- Monitor for breaking changes in response format
- Update error messages and user feedback

---

**Last Updated**: April 21, 2026  
**Maintainer**: PYU-GO Ride Team  
**Status**: Production Ready

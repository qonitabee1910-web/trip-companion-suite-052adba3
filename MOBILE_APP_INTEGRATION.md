# Module Separation Guide for Mobile Apps (Flutter/Capacitor)

## Overview

The authentication, user, and driver modules have been separated and reorganized
to make it easier to integrate with mobile applications built with Flutter or
Capacitor.

**Key Principle**: Each module now has a clear, independent API layer (`*Api.ts`
files) that can be easily called from mobile clients.

---

## Architecture

### Module Structure

```
src/modules/
├── auth/                    # Authentication only (login, signup, password reset)
│   ├── index.ts            # Module manifest
│   └── pages/
│       ├── AuthPage.tsx    # Login/Signup UI
│       └── ResetPasswordPage.tsx
│
├── user/                    # User Profile (generic for all user types)
│   ├── index.ts            # Module manifest
│   ├── data/
│   │   └── userApi.ts      # Profile API (independent module)
│   ├── hooks/
│   │   └── useUserProfile.ts
│   └── pages/
│       └── UserProfile.tsx # Generic profile UI
│
└── driver/                  # Driver-specific features
    ├── index.ts            # Module manifest
    ├── data/
    │   ├── driver.ts       # Type definitions
    │   └── driverApi.ts    # Driver profile & operations API
    ├── hooks/
    │   └── useActiveRide.ts, etc.
    └── pages/
        ├── DriverLogin.tsx
        ├── DriverHome.tsx
        ├── DriverProfile.tsx
        └── ...
```

---

## API Layers (Ready for Mobile)

### 1. Authentication API

**File**: `src/shared/auth/authApi.ts`

```typescript
// Login
signIn(email, password);

// Signup with role assignment
signUpWithRole({
    email,
    password,
    fullName,
    phone,
    role: "rider" | "driver",
});

// Password management
requestPasswordReset(email);
updatePassword(newPassword);

// Logout
signOut();
```

**Usage from Flutter/Capacitor**:

```typescript
// Call from native code via bridge
const { user } = await signIn("user@example.com", "password");
```

---

### 2. User Profile API

**File**: `src/modules/user/data/userApi.ts`

**Purpose**: Generic user profile operations for riders, drivers, and admins.

```typescript
// Get user profile
getUserProfile(userId): Promise<UserProfile>

// Update profile
updateUserProfile(userId, updates): Promise<void>

// Upload avatar
uploadUserAvatar(userId, file): Promise<string>

// Get booking statistics (riders)
getUserStats(userId): Promise<{ totalBookings, totalSpend, ... }>

// Get bookings list
getUserBookings(userId, limit): Promise<{ shuttleBookings, hotelBookings }>
```

**User Profile Interface**:

```typescript
interface UserProfile {
    id: string;
    full_name: string | null;
    phone: string | null;
    photo_url: string | null;
    email?: string | null;
    address?: string | null;
    bio?: string | null;
    created_at?: string;
    updated_at?: string;
}
```

---

### 3. Driver Profile API

**File**: `src/modules/driver/data/driverApi.ts`

**Purpose**: Driver-specific profile, verification, and operations.

```typescript
// Get driver profile with all driver data
getDriverProfile(driverId): Promise<DriverProfile>

// Update driver info (vehicle, plate, etc.)
updateDriverProfile(driverId, updates): Promise<void>

// Upload verification documents (SIM, STNK)
uploadDriverDocument(driverId, file, type: "sim" | "stnk"): Promise<string>

// Status management
setDriverOnlineStatus(driverId, isOnline): Promise<void>
updateDriverLocation(driverId, lat, lng): Promise<void>

// Statistics
getDriverStats(driverId): Promise<{ totalTrips, today, week, month }>

// Rides
getDriverActiveRides(driverId): Promise<Ride[]>
getDriverRideHistory(driverId, limit): Promise<Ride[]>
```

**Driver Profile Interface**:

```typescript
interface DriverProfile extends UserProfile {
    vehicle_type: string | null;
    plate: string | null;
    rating: number;
    is_online: boolean;
    current_lat: number | null;
    current_lng: number | null;
    verification_status?: "pending" | "verified" | "rejected";
    sim_url?: string | null;
    stnk_url?: string | null;
    sim_expiry?: string | null;
}
```

---

## Integration for Mobile Apps

### Flutter Example

```dart
// 1. Authentication
final response = await supabaseClient
  .auth
  .signUpWithPassword(
    email: 'driver@example.com',
    password: 'password123',
    data: {'full_name': 'John Doe', 'phone': '08123456789'}
  );

// 2. Get user profile (generic)
final profile = await supabaseClient
  .from('profiles')
  .select()
  .eq('id', userId)
  .single();

// 3. Get driver profile (if driver role)
final driverProfile = await supabaseClient
  .from('drivers')
  .select()
  .eq('id', driverId)
  .single();

// 4. Update driver location (real-time)
await supabaseClient
  .from('drivers')
  .update({'current_lat': lat, 'current_lng': lng})
  .eq('id', driverId);

// 5. Upload verification document
final file = await FilePicker.platform.pickFiles();
final uploadedUrl = await supabaseClient
  .storage
  .from('driver_docs')
  .upload('$driverId/sim.pdf', file.bytes!);
```

### React/Web Usage

```typescript
import { signIn, signUpWithRole } from "@/shared/auth/authApi";

import {
    getUserProfile,
    updateUserProfile,
    uploadUserAvatar,
} from "@/modules/user/data/userApi";

import {
    getDriverProfile,
    setDriverOnlineStatus,
    updateDriverProfile,
    uploadDriverDocument,
} from "@/modules/driver/data/driverApi";

// Sign up a new driver
await signUpWithRole({
    email: "driver@example.com",
    password: "password123",
    fullName: "John Doe",
    phone: "08123456789",
    role: "driver",
});

// Get driver profile
const driver = await getDriverProfile(userId);

// Update location
await updateDriverLocation(userId, 10.1234, 105.5678);

// Upload SIM
const simUrl = await uploadDriverDocument(userId, simFile, "sim");
```

---

## Separation of Concerns

| Concern                          | Module                     | API                  |
| -------------------------------- | -------------------------- | -------------------- |
| **Authentication**               | `auth`                     | `authApi.ts`         |
| **User Profile** (all types)     | `user`                     | `userApi.ts`         |
| **Driver Profile** (driver-only) | `driver`                   | `driverApi.ts`       |
| **Rider Bookings**               | `shuttle`, `hotel`, `ride` | Module-specific APIs |
| **Admin Functions**              | `admin`                    | Module-specific APIs |

---

## Key Benefits for Mobile Development

✅ **Clean Separation**: Auth, User, and Driver APIs are completely separate\
✅ **Type Safety**: Full TypeScript interfaces for all data types\
✅ **Direct Database Access**: Mobile apps can call Supabase directly using the
same schema\
✅ **Real-time Sync**: Supabase Realtime integration ready\
✅ **Modular**: Each module can be tested and deployed independently\
✅ **No Web UI Dependency**: Mobile apps only import the API layer (`*Api.ts`),
not UI components

---

## Migration from Web to Mobile

### Before (Tightly Coupled)

```
Mobile App → Web Backend (REST) → Database
```

### After (Clean APIs)

```
Mobile App → Supabase Client (Direct) → Database
```

Mobile apps can now:

1. Use Supabase Flutter/JavaScript client directly
2. Call the same API functions
3. Reuse TypeScript types via codegen

---

## Next Steps

1. **Export API Functions**: Add exports to module `index.module.ts` files ✅
   (Done)
2. **Create Mobile SDK**: Generate TypeScript/Dart types from API layer
3. **Setup CI/CD**: Build and deploy APIs independently
4. **Testing**: Unit tests for API layer before UI components
5. **Documentation**: Add JSDoc comments to all API functions

---

## File Organization Summary

```
User Journey for Driver Signup/Login:

1. Authentication Phase
   └── src/shared/auth/authApi.ts
       ├── signUpWithRole() → creates auth.users, profiles, user_roles, drivers
       └── signIn() → authenticates user

2. Profile Management Phase
   └── src/modules/driver/data/driverApi.ts
       ├── getDriverProfile() → fetches driver details
       ├── updateDriverProfile() → updates vehicle, plate, etc.
       ├── uploadDriverDocument() → uploads SIM/STNK
       └── setDriverOnlineStatus() → marks driver online/offline

3. Operations Phase
   └── src/modules/driver/data/driverApi.ts
       ├── updateDriverLocation() → real-time tracking
       ├── getDriverActiveRides() → live ride requests
       └── getDriverStats() → performance metrics
```

---

## Troubleshooting

### Import Errors

✅ Correct:

```typescript
import { getDriverProfile } from "@/modules/driver/data/driverApi";
import { getUserProfile } from "@/modules/user/data/userApi";
import { signIn } from "@/shared/auth/authApi";
```

❌ Incorrect (don't import UI components in mobile):

```typescript
import DriverProfile from "@/modules/driver/pages/DriverProfile";
```

### Database Permissions

All APIs respect Supabase Row Level Security (RLS). Ensure your mobile app:

1. Authenticates with `supabase.auth.signInWithPassword()`
2. Stores the session token
3. Includes it in all subsequent requests

---

## Related Documentation

- [Supabase Flutter Setup](https://supabase.com/docs/reference/flutter/introduction)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Capacitor Supabase Integration](https://supabase.com/docs/guides/realtime/applications/react-native)

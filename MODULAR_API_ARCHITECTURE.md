# Modular API Architecture

## Overview

This document describes the clean API separation between **Auth**, **User**, and
**Driver** modules, designed for easy consumption by mobile applications.

---

## Module APIs at a Glance

### 📱 Authentication (`authApi.ts`)

Core authentication operations - **used by all apps**

```
src/shared/auth/authApi.ts
├── signIn(email, password)
├── signUpWithRole(options)
├── signOut()
├── requestPasswordReset(email)
└── updatePassword(newPassword)
```

### 👤 User Profile (`userApi.ts`)

Generic profile management - **used by riders, drivers, admins**

```
src/modules/user/data/userApi.ts
├── getUserProfile(userId)
├── updateUserProfile(userId, updates)
├── uploadUserAvatar(userId, file)
├── getUserStats(userId)
└── getUserBookings(userId, limit)
```

### 🚗 Driver Profile (`driverApi.ts`)

Driver-specific operations - **used by drivers only**

```
src/modules/driver/data/driverApi.ts
├── getDriverProfile(driverId)
├── updateDriverProfile(driverId, updates)
├── uploadDriverDocument(driverId, file, type)
├── setDriverOnlineStatus(driverId, isOnline)
├── updateDriverLocation(driverId, lat, lng)
├── getDriverStats(driverId)
├── getDriverActiveRides(driverId)
└── getDriverRideHistory(driverId, limit)
```

---

## Data Flow Example: Driver Registration & Login

### 1️⃣ Signup Phase

**File**: `authApi.ts`

```typescript
// Mobile app calls:
const { user, session } = await signUpWithRole({
    email: "driver@example.com",
    password: "SecurePass123",
    fullName: "John Doe",
    phone: "+6281234567890",
    role: "driver", // ← Key: role assignment
});

// Backend automatically:
// ✓ Creates auth.users record
// ✓ Creates profiles record (name, phone)
// ✓ Creates user_roles record (role=driver)
// ✓ Creates drivers record (vehicle_type, plate, etc.)
```

### 2️⃣ Login Phase

**File**: `authApi.ts`

```typescript
const { user, session } = await signIn(
    "driver@example.com",
    "SecurePass123",
);

// Returns authenticated user
// Session token stored in localStorage/secure storage
```

### 3️⃣ Fetch Driver Profile

**File**: `driverApi.ts`

```typescript
const driverProfile = await getDriverProfile(user.id);

// Returns:
// {
//   id: "uuid",
//   full_name: "John Doe",
//   phone: "+6281234567890",
//   photo_url: "https://...",
//   vehicle_type: "car",
//   plate: "B 1234 ABC",
//   rating: 4.8,
//   is_online: false,
//   verification_status: "pending",
//   ...
// }
```

### 4️⃣ Update Driver Status (Online)

**File**: `driverApi.ts`

```typescript
await setDriverOnlineStatus(user.id, true);

// Also update location
await updateDriverLocation(user.id, -6.1234, 106.7890);
```

### 5️⃣ Upload Verification Documents

**File**: `driverApi.ts`

```typescript
// Upload SIM (driving license)
const simUrl = await uploadDriverDocument(user.id, simFile, "sim");

// Upload STNK (vehicle registration)
const stnkUrl = await uploadDriverDocument(user.id, stnkFile, "stnk");

// Documents stored and referenced in drivers table:
// {
//   sim_url: "https://storage.../driver/sim.pdf",
//   stnk_url: "https://storage.../driver/stnk.pdf",
//   verification_status: "pending"  // Auto-set to pending
// }
```

### 6️⃣ Get Driver Statistics

**File**: `driverApi.ts`

```typescript
const stats = await getDriverStats(user.id);

// Returns:
// {
//   totalTrips: 127,
//   today: 5,
//   week: 28,
//   month: 95
// }
```

---

## Module Dependencies

```
┌─────────────────────────────────────┐
│   Mobile App (Flutter/Capacitor)    │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    ┌────────────────────────────────┐
    │  Authentication Layer          │
    │  (authApi.ts)                  │
    └────────────────────────────────┘
        │          │          │
        ▼          ▼          ▼
    ┌────────────────────────────────┐
    │  User/Driver Profile Layer     │
    │  (userApi.ts, driverApi.ts)    │
    └────────────────────────────────┘
        │          │          │
        ▼          ▼          ▼
    ┌────────────────────────────────┐
    │  Supabase Postgres Database    │
    │  (with RLS policies)           │
    └────────────────────────────────┘
```

---

## Key Design Patterns

### ✅ Separation of Concerns

| Layer               | Responsibility                  | File           |
| ------------------- | ------------------------------- | -------------- |
| **Authentication**  | Login, signup, password reset   | `authApi.ts`   |
| **Profile**         | Generic user data (all types)   | `userApi.ts`   |
| **Driver-Specific** | Driver operations, verification | `driverApi.ts` |
| **UI**              | React components (web only)     | `pages/*.tsx`  |

### ✅ No Circular Dependencies

```typescript
// ✓ This is OK:
userApi.ts → useAuth hook → AuthProvider

// ✓ This is OK:
driverApi.ts → Supabase client

// ✗ This should NOT happen:
DriverProfile.tsx → driverApi.ts (in mobile app)
// Instead: Mobile app directly imports driverApi.ts
```

### ✅ Type Safety

All functions are **fully typed** for mobile integration:

```typescript
// TypeScript ensures mobile apps get autocomplete
const profile: UserProfile = await getUserProfile(userId);

// Can be used with Dart codegen tools
// or Rust type generation for mobile apps
```

---

## Integration Points

### For React Web Apps

```typescript
import { getDriverProfile } from "@/modules/driver/data/driverApi";
import { useAuth } from "@/shared/auth";

function DriverDashboard() {
    const { user } = useAuth();
    const [driver, setDriver] = useState<DriverProfile>();

    useEffect(() => {
        if (user) {
            getDriverProfile(user.id).then(setDriver);
        }
    }, [user]);

    return <div>{driver?.full_name}</div>;
}
```

### For Flutter Apps

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

final supabase = Supabase.instance.client;

// Get user
final user = supabase.auth.currentUser;

// Call same SQL that web app uses
final driverProfile = await supabase
  .from('drivers')
  .select('*')
  .eq('id', user!.id)
  .single();

// Update location
await supabase
  .from('drivers')
  .update({'current_lat': lat, 'current_lng': lng})
  .eq('id', user.id);
```

### For React Native / Capacitor

```typescript
import {
    getDriverProfile,
    updateDriverLocation,
} from "@trip-companion/driver-api";

const driverProfile = await getDriverProfile(userId);
await updateDriverLocation(userId, -6.1234, 106.7890);
```

---

## Testing the APIs

### Unit Test Example

```typescript
import { getDriverProfile, updateDriverProfile } from "../driverApi";
import { supabase } from "@/integrations/supabase/client";

describe("Driver API", () => {
    it("should fetch driver profile", async () => {
        const driverId = "test-driver-123";
        const profile = await getDriverProfile(driverId);

        expect(profile).toBeDefined();
        expect(profile?.vehicle_type).toBe("car");
    });

    it("should update driver profile", async () => {
        const driverId = "test-driver-123";
        await updateDriverProfile(driverId, {
            plate: "B 9999 XYZ",
        });

        const updated = await getDriverProfile(driverId);
        expect(updated?.plate).toBe("B 9999 XYZ");
    });
});
```

---

## Error Handling

All APIs throw proper errors for mobile apps:

```typescript
try {
    const driver = await getDriverProfile(userId);
} catch (error: any) {
    if (error.code === "PGRST116") {
        console.error("Driver not found");
    } else if (error.message.includes("JWT")) {
        console.error("Session expired - re-authenticate");
    } else {
        console.error("Unknown error:", error);
    }
}
```

---

## Performance Optimizations

### Caching (Flutter Example)

```dart
// Cache driver profile for 5 minutes
class DriverRepository {
  DriverProfile? _cached;
  DateTime? _cachedAt;
  
  Future<DriverProfile> getProfile(String driverId) async {
    final now = DateTime.now();
    if (_cached != null && 
        _cachedAt != null && 
        now.difference(_cachedAt!).inMinutes < 5) {
      return _cached!;
    }
    
    _cached = await getDriverProfile(driverId);
    _cachedAt = now;
    return _cached!;
  }
}
```

### Real-time Sync (Supabase Realtime)

```typescript
// Subscribe to driver location updates
const subscription = supabase
    .from(`drivers:id=eq.${driverId}`)
    .on("*", (payload) => {
        console.log("Driver location updated:", payload.new);
    })
    .subscribe();
```

---

## Checklist for Mobile Implementation

- [ ] Setup Supabase client in mobile app
- [ ] Implement authentication (sign up, sign in)
- [ ] Create User model from `UserProfile` interface
- [ ] Create Driver model from `DriverProfile` interface
- [ ] Implement profile loading on app startup
- [ ] Setup location tracking (driver)
- [ ] Handle token refresh
- [ ] Implement error boundaries
- [ ] Test RLS policies
- [ ] Setup offline-first caching
- [ ] Implement real-time sync

---

## Related Files

- [MOBILE_APP_INTEGRATION.md](./MOBILE_APP_INTEGRATION.md) - High-level guide
- [src/shared/auth/authApi.ts](./src/shared/auth/authApi.ts) - Auth functions
- [src/modules/user/data/userApi.ts](./src/modules/user/data/userApi.ts) - User
  functions
- [src/modules/driver/data/driverApi.ts](./src/modules/driver/data/driverApi.ts) -
  Driver functions

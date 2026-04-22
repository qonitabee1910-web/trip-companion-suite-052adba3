# Mobile Integration Implementation Guides

## Quick Start - Choose Your Platform

### 🔗 Table of Contents

1. [Flutter](#flutter)
2. [React Native + Capacitor](#react-native--capacitor)
3. [Capacitor + Vue/Angular](#capacitor--vueangular)

---

## Flutter

### Setup

```bash
flutter pub add supabase_flutter
```

### Initialize

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  await Supabase.initialize(
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
  );
  runApp(MyApp());
}

final supabase = Supabase.instance.client;
```

### Authentication

```dart
// Sign Up as Driver
Future<void> signUpDriver({
  required String email,
  required String password,
  required String fullName,
  required String phone,
}) async {
  try {
    final response = await supabase.auth.signUp(
      email: email,
      password: password,
      data: {
        'full_name': fullName,
        'phone': phone,
      },
    );

    // Assign driver role
    final userId = response.user!.id;
    await supabase.from('user_roles').insert({
      'user_id': userId,
      'role': 'driver',
    });

    // Create driver record
    await supabase.from('drivers').insert({
      'id': userId,
      'vehicle_type': 'car',
      'plate': '',
    });

    print('Driver registered successfully');
  } catch (e) {
    print('Sign up error: $e');
    rethrow;
  }
}

// Sign In
Future<User?> signIn({
  required String email,
  required String password,
}) async {
  try {
    final response = await supabase.auth.signInWithPassword(
      email: email,
      password: password,
    );
    return response.user;
  } catch (e) {
    print('Sign in error: $e');
    rethrow;
  }
}

// Sign Out
Future<void> signOut() async {
  await supabase.auth.signOut();
}
```

### User Profile Management

```dart
// Define models
class UserProfile {
  final String id;
  final String? fullName;
  final String? phone;
  final String? photoUrl;
  final String? address;
  final String? bio;

  UserProfile({
    required this.id,
    this.fullName,
    this.phone,
    this.photoUrl,
    this.address,
    this.bio,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      photoUrl: json['photo_url'] as String?,
      address: json['address'] as String?,
      bio: json['bio'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'full_name': fullName,
      'phone': phone,
      'photo_url': photoUrl,
      'address': address,
      'bio': bio,
    };
  }
}

// Get user profile
Future<UserProfile?> getUserProfile(String userId) async {
  try {
    final response = await supabase
        .from('profiles')
        .select()
        .eq('id', userId)
        .maybeSingle();

    if (response == null) return null;
    return UserProfile.fromJson(response);
  } catch (e) {
    print('Error fetching profile: $e');
    return null;
  }
}

// Update user profile
Future<void> updateUserProfile(
  String userId,
  UserProfile profile,
) async {
  try {
    await supabase
        .from('profiles')
        .update(profile.toJson())
        .eq('id', userId);
  } catch (e) {
    print('Error updating profile: $e');
    rethrow;
  }
}
```

### Driver-Specific Operations

```dart
class DriverProfile extends UserProfile {
  final String? vehicleType;
  final String? plate;
  final double rating;
  final bool isOnline;
  final double? currentLat;
  final double? currentLng;
  final String? verificationStatus;
  final String? simUrl;
  final String? stnkUrl;

  DriverProfile({
    required super.id,
    super.fullName,
    super.phone,
    super.photoUrl,
    super.address,
    super.bio,
    this.vehicleType,
    this.plate,
    required this.rating,
    required this.isOnline,
    this.currentLat,
    this.currentLng,
    this.verificationStatus,
    this.simUrl,
    this.stnkUrl,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      id: json['id'] as String,
      fullName: json['full_name'] as String?,
      phone: json['phone'] as String?,
      photoUrl: json['photo_url'] as String?,
      vehicleType: json['vehicle_type'] as String?,
      plate: json['plate'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
      isOnline: json['is_online'] as bool? ?? false,
      currentLat: (json['current_lat'] as num?)?.toDouble(),
      currentLng: (json['current_lng'] as num?)?.toDouble(),
      verificationStatus: json['verification_status'] as String?,
      simUrl: json['sim_url'] as String?,
      stnkUrl: json['stnk_url'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'vehicle_type': vehicleType,
      'plate': plate,
      'is_online': isOnline,
      'current_lat': currentLat,
      'current_lng': currentLng,
    };
  }
}

// Get driver profile
Future<DriverProfile?> getDriverProfile(String driverId) async {
  try {
    final response = await supabase
        .from('drivers')
        .select()
        .eq('id', driverId)
        .maybeSingle();

    if (response == null) return null;
    return DriverProfile.fromJson(response);
  } catch (e) {
    print('Error fetching driver profile: $e');
    return null;
  }
}

// Set online status
Future<void> setDriverOnlineStatus(
  String driverId,
  bool isOnline,
) async {
  try {
    await supabase
        .from('drivers')
        .update({'is_online': isOnline})
        .eq('id', driverId);
  } catch (e) {
    print('Error setting online status: $e');
    rethrow;
  }
}

// Update location in real-time
Future<void> updateDriverLocation(
  String driverId,
  double lat,
  double lng,
) async {
  try {
    await supabase
        .from('drivers')
        .update({
          'current_lat': lat,
          'current_lng': lng,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('id', driverId);
  } catch (e) {
    print('Error updating location: $e');
    rethrow;
  }
}

// Upload documents
Future<String> uploadDriverDocument(
  String driverId,
  String filePath,
  String docType, // 'sim' or 'stnk'
) async {
  try {
    final file = File(filePath);
    final fileName = '${docType}_${DateTime.now().millisecondsSinceEpoch}.pdf';
    
    final response = await supabase.storage
        .from('driver_docs')
        .upload('$driverId/$fileName', file);

    final urlResponse = supabase.storage
        .from('driver_docs')
        .getPublicUrl('$driverId/$fileName');

    // Update driver record
    final updateKey = '${docType}_url';
    await supabase
        .from('drivers')
        .update({updateKey: urlResponse})
        .eq('id', driverId);

    return urlResponse;
  } catch (e) {
    print('Error uploading document: $e');
    rethrow;
  }
}

// Get active rides
Future<List<Map<String, dynamic>>> getActiveRides(String driverId) async {
  try {
    final response = await supabase
        .from('rides')
        .select()
        .eq('driver_id', driverId)
        .inFilter('status', ['accepted', 'arriving', 'in_progress'])
        .order('created_at', ascending: false);

    return response;
  } catch (e) {
    print('Error fetching active rides: $e');
    return [];
  }
}
```

### Real-time Location Tracking

```dart
class LocationService {
  static void startLocationTracking(String driverId) {
    LocationManager.getLocationStream().listen((location) {
      updateDriverLocation(
        driverId,
        location.latitude,
        location.longitude,
      );
    });
  }

  static void subscribeToRideUpdates(String rideId) {
    supabase
        .from('rides')
        .on(SupabaseEventTypes.update,
            filter: SupabaseEventFilter(
              event: '*',
              schema: 'public',
              table: 'rides',
              cond: 'id=eq.$rideId',
            ), (payload) {
      print('Ride updated: ${payload.newRecord}');
    }).subscribe();
  }
}
```

---

## React Native + Capacitor

### Setup

```bash
npm install @supabase/supabase-js @capacitor/core @capacitor/cli
npx cap init
```

### Initialize

```typescript
import { createClient } from "@supabase/supabase-js";
import { Preferences } from "@capacitor/preferences";

const supabase = createClient(
    "https://your-project.supabase.co",
    "your-anon-key",
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            storage: {
                getItem: async (key: string) => {
                    const { value } = await Preferences.get({ key });
                    return value;
                },
                setItem: async (key: string, value: string) => {
                    await Preferences.set({ key, value });
                },
                removeItem: async (key: string) => {
                    await Preferences.remove({ key });
                },
            },
        },
    },
);

export default supabase;
```

### Components

```typescript
// Authentication Provider
import React, { ReactNode, useEffect, useState } from "react";
import { useAsyncStorage } from "@react-native-async-storage/async-storage";
import supabase from "./supabase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUpDriver: (data: DriverSignupData) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        setUser(data.user);
    };

    const signUpDriver = async (data: DriverSignupData) => {
        const { data: authData, error: authError } = await supabase.auth.signUp(
            {
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.fullName,
                        phone: data.phone,
                    },
                },
            },
        );

        if (authError) throw authError;

        const userId = authData.user!.id;

        // Set driver role
        await supabase.from("user_roles").insert({
            user_id: userId,
            role: "driver",
        });

        // Create driver record
        await supabase.from("drivers").insert({
            id: userId,
            vehicle_type: "car",
        });

        setUser(authData.user);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ user, loading, signIn, signUpDriver, signOut }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = React.useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within AuthProvider");
    }
    return context;
};
```

### Driver Profile Hook

```typescript
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import supabase from "./supabase";

export function useDriverProfile() {
    const { user } = useAuth();
    const [driver, setDriver] = useState<DriverProfile | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchDriver = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("drivers")
                .select("*")
                .eq("id", user.id)
                .single();

            if (error) throw error;
            setDriver(data);
        } finally {
            setLoading(false);
        }
    };

    const updateDriver = async (updates: Partial<DriverProfile>) => {
        if (!user) return;
        const { error } = await supabase
            .from("drivers")
            .update(updates)
            .eq("id", user.id);

        if (error) throw error;
        await fetchDriver();
    };

    const setOnline = async (online: boolean) => {
        await updateDriver({ is_online: online });
    };

    useEffect(() => {
        fetchDriver();
    }, [user]);

    return {
        driver,
        loading,
        fetchDriver,
        updateDriver,
        setOnline,
    };
}
```

### Location Tracking

```typescript
import { Geolocation } from "@capacitor/geolocation";
import supabase from "./supabase";
import { useAuth } from "./AuthContext";

export function useLocationTracking() {
    const { user } = useAuth();

    const startTracking = async () => {
        const id = setInterval(async () => {
            try {
                const coordinates = await Geolocation.getCurrentPosition();

                if (user) {
                    await supabase
                        .from("drivers")
                        .update({
                            current_lat: coordinates.coords.latitude,
                            current_lng: coordinates.coords.longitude,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", user.id);
                }
            } catch (error) {
                console.error("Location update error:", error);
            }
        }, 5000); // Update every 5 seconds

        return id;
    };

    const stopTracking = (id: NodeJS.Timeout) => {
        clearInterval(id);
    };

    return { startTracking, stopTracking };
}
```

### Screen Component

```typescript
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useDriverProfile } from "../hooks/useDriverProfile";

export function DriverProfileScreen() {
    const { user, signOut } = useAuth();
    const { driver, loading, updateDriver, setOnline } = useDriverProfile();

    const [fullName, setFullName] = useState("");
    const [vehicleType, setVehicleType] = useState("");
    const [plate, setPlate] = useState("");

    useEffect(() => {
        if (driver) {
            // Update state from driver profile
            setVehicleType(driver.vehicle_type || "");
            setPlate(driver.plate || "");
        }
    }, [driver]);

    const handleSave = async () => {
        try {
            await updateDriver({
                vehicle_type: vehicleType,
                plate,
            });
            Alert.alert("Success", "Profile updated");
        } catch (error) {
            Alert.alert("Error", "Failed to update profile");
        }
    };

    const handleToggleOnline = async () => {
        try {
            await setOnline(!driver?.is_online);
        } catch (error) {
            Alert.alert("Error", "Failed to update status");
        }
    };

    if (loading) {
        return <ActivityIndicator />;
    }

    return (
        <ScrollView>
            <View>
                <Text>Driver Profile</Text>

                <TextInput
                    placeholder="Vehicle Type"
                    value={vehicleType}
                    onChangeText={setVehicleType}
                />

                <TextInput
                    placeholder="Plate Number"
                    value={plate}
                    onChangeText={setPlate}
                />

                <TouchableOpacity onPress={handleSave}>
                    <Text>Save</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleToggleOnline}>
                    <Text>
                        {driver?.is_online ? "Go Offline" : "Go Online"}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => signOut()}>
                    <Text>Logout</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}
```

---

## Capacitor + Vue/Angular

### Vue 3 Example

```vue
<template>
  <div class="driver-profile">
    <div v-if="loading" class="spinner">Loading...</div>
    
    <div v-else class="profile-form">
      <div class="form-group">
        <label>Vehicle Type</label>
        <input v-model="form.vehicleType" />
      </div>
      
      <div class="form-group">
        <label>Plate Number</label>
        <input v-model="form.plate" />
      </div>
      
      <button @click="saveProfile" :disabled="saving">
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
      
      <button @click="toggleOnlineStatus">
        {{ driver?.is_online ? 'Go Offline' : 'Go Online' }}
      </button>
      
      <button @click="logout">Logout</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useDriverProfile } from '@/composables/useDriverProfile';

const { user, signOut } = useAuth();
const { driver, fetchDriver, updateDriver } = useDriverProfile();
const loading = ref(true);
const saving = ref(false);

const form = ref({
  vehicleType: '',
  plate: '',
});

onMounted(async () => {
  await fetchDriver();
  if (driver.value) {
    form.value = {
      vehicleType: driver.value.vehicle_type || '',
      plate: driver.value.plate || '',
    };
  }
  loading.value = false;
});

const saveProfile = async () => {
  saving.value = true;
  try {
    await updateDriver({
      vehicle_type: form.value.vehicleType,
      plate: form.value.plate,
    });
    alert('Profile saved successfully');
  } catch (error) {
    alert('Failed to save profile');
  } finally {
    saving.value = false;
  }
};

const toggleOnlineStatus = async () => {
  try {
    await updateDriver({
      is_online: !(driver.value?.is_online || false),
    });
  } catch (error) {
    alert('Failed to update status');
  }
};

const logout = async () => {
  await signOut();
  // Navigate to login
};
</script>
```

---

## Common Patterns

### Error Handling

```typescript
try {
    await updateDriverProfile(userId, updates);
} catch (error) {
    if (error instanceof AuthApiError) {
        // Auth-specific error
        console.error("Auth error:", error.message);
    } else {
        // Generic error
        console.error("Error:", error);
    }
}
```

### Offline Support

```typescript
// Use local storage as fallback
const getDriver = async (id: string) => {
    try {
        return await getDriverProfile(id);
    } catch {
        const cached = await localStorage.getItem(`driver_${id}`);
        return cached ? JSON.parse(cached) : null;
    }
};
```

### Retry Logic

```typescript
async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        }
    }
    throw new Error("Max retries reached");
}
```

---

## Testing

### Unit Tests

```typescript
import { fireEvent, render, screen } from "@testing-library/react-native";
import { DriverProfileScreen } from "@/screens/DriverProfileScreen";

describe("DriverProfileScreen", () => {
    it("should display driver profile", async () => {
        render(<DriverProfileScreen />);

        expect(screen.getByText("Driver Profile")).toBeDefined();
    });

    it("should update profile on save", async () => {
        render(<DriverProfileScreen />);

        const input = screen.getByPlaceholderText("Plate Number");
        fireEvent.changeText(input, "B 1234 ABC");

        const saveButton = screen.getByText("Save");
        fireEvent.press(saveButton);

        // Assert update happened
    });
});
```

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase RLS policies verified
- [ ] Authentication flow tested
- [ ] Profile operations tested
- [ ] Location tracking tested
- [ ] Error handling tested
- [ ] Offline mode tested
- [ ] Build and sign APK/IPA
- [ ] Deploy to app stores

---

## Resources

- [Supabase Flutter Docs](https://supabase.com/docs/reference/flutter/introduction)
- [Capacitor Docs](https://capacitorjs.com/)
- [React Native Supabase](https://supabase.com/docs/guides/realtime/applications/react-native)

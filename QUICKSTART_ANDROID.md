# Quick Start - Mobile App Development

**Selamat datang developer Android!** 👋

Panduan singkat untuk mulai build aplikasi Android menggunakan Flutter atau
Capacitor dengan Trip Companion API.

---

## 🚀 5 Menit Setup

### Step 1: Siapkan Environment

```bash
# Flutter
flutter create trip_companion_driver
cd trip_companion_driver

# Or React Native + Capacitor
npx create-expo-app trip_companion_driver
cd trip_companion_driver
npm install @supabase/supabase-js @capacitor/core
```

### Step 2: Setup Supabase

```dart
// Flutter
import 'package:supabase_flutter/supabase_flutter.dart';

void main() async {
  await Supabase.initialize(
    url: 'https://your-project.supabase.co',
    anonKey: 'your-anon-key',
  );
  runApp(MyApp());
}
```

### Step 3: Login Screen

```dart
final supabase = Supabase.instance.client;

// Sign In
final response = await supabase.auth.signInWithPassword(
  email: 'driver@example.com',
  password: 'password123',
);

// Sign Up Driver
await supabase.auth.signUp(
  email: 'driver@example.com',
  password: 'password123',
  data: {'full_name': 'John Doe', 'phone': '+6281234567890'},
);

// Assign role
await supabase.from('user_roles').insert({
  'user_id': response.user!.id,
  'role': 'driver',
});

// Create driver record
await supabase.from('drivers').insert({
  'id': response.user!.id,
  'vehicle_type': 'car',
  'plate': 'B 1234 ABC',
});
```

### Step 4: Get Driver Profile

```dart
final driver = await supabase
  .from('drivers')
  .select('*')
  .eq('id', currentUser.id)
  .single();

print('Driver: ${driver['full_name']}');
print('Vehicle: ${driver['vehicle_type']}');
print('Rating: ${driver['rating']}');
```

### Step 5: Real-time Location

```dart
import 'package:geolocator/geolocator.dart';

// Update location every 5 seconds
Timer.periodic(Duration(seconds: 5), (_) async {
  final position = await Geolocator.getCurrentPosition();
  
  await supabase.from('drivers').update({
    'current_lat': position.latitude,
    'current_lng': position.longitude,
  }).eq('id', currentUser.id);
});
```

---

## 📚 Dokumentasi Lengkap

| Dokumen                                                              | Isi                                     |
| -------------------------------------------------------------------- | --------------------------------------- |
| [MOBILE_APP_INTEGRATION.md](./MOBILE_APP_INTEGRATION.md)             | Panduan lengkap integrasi mobile        |
| [MODULAR_API_ARCHITECTURE.md](./MODULAR_API_ARCHITECTURE.md)         | Detail arsitektur API                   |
| [MOBILE_IMPLEMENTATION_GUIDES.md](./MOBILE_IMPLEMENTATION_GUIDES.md) | Contoh Flutter, React Native, Capacitor |

---

## 🔌 API yang Tersedia

### Authentication

```dart
// Login
signInWithPassword(email, password)

// Signup
signUp(email, password, data)

// Logout
signOut()

// Reset Password
resetPasswordForEmail(email)
```

### User Profile

```dart
// Ambil profil
db.from('profiles').select().eq('id', userId)

// Update profil
db.from('profiles').update({...}).eq('id', userId)

// Upload foto
storage.from('avatars').upload(path, file)
```

### Driver

```dart
// Ambil profil driver
db.from('drivers').select().eq('id', driverId)

// Update status online
db.from('drivers').update({'is_online': true}).eq('id', driverId)

// Upload dokumen SIM/STNK
storage.from('driver_docs').upload(path, file)

// Update lokasi
db.from('drivers').update({
  'current_lat': lat,
  'current_lng': lng,
}).eq('id', driverId)

// Ambil ride aktif
db.from('rides')
  .select()
  .eq('driver_id', driverId)
  .inFilter('status', ['accepted', 'arriving', 'in_progress'])
```

---

## 🎯 Contoh Feature

### 1. Login Screen

```dart
// 1. User input email & password
// 2. Validasi input
// 3. Call signIn
// 4. Jika sukses, simpan token
// 5. Redirect ke home screen
```

### 2. Profile Screen

```dart
// 1. Load driver profile saat screen dibuka
// 2. Display nama, vehicle type, rating
// 3. Tombol edit untuk update info
// 4. Tombol upload SIM/STNK
// 5. Tombol ubah password
```

### 3. Online/Offline Toggle

```dart
// 1. Button toggle di top screen
// 2. Call setOnlineStatus
// 3. Start location tracking (if online)
// 4. Update UI dengan status terbaru
```

### 4. Active Rides

```dart
// 1. Load active rides saat app start
// 2. Subscribe to realtime updates
// 3. Show ride list dengan pickup/dropoff
// 4. Tap untuk accept/reject
// 5. During trip, show live map
```

---

## ⚠️ Penting!

### Supabase Row Level Security

Semua operasi terbatas hanya ke user yang login:

```sql
-- Users hanya bisa baca profil mereka sendiri
SELECT * FROM profiles WHERE id = auth.uid()

-- Drivers hanya bisa update data mereka
UPDATE drivers SET ... WHERE id = auth.uid()
```

Jadi, pastikan:

1. ✅ User login dulu sebelum API calls
2. ✅ Session token selalu disertakan
3. ✅ Handle token refresh otomatis

### Location Tracking

```dart
// Jangan update location terlalu sering
// Update setiap 5-10 detik sudah cukup
// Hemat battery!
```

### Upload Dokumen

```dart
// Upload dokumen besar bisa lambat
// Show progress bar kepada user
// Pastikan format file valid (PDF, JPG, PNG)
```

---

## 📱 Platform-Specific

### Flutter

```bash
flutter pub add supabase_flutter
flutter pub add geolocator              # Location
flutter pub add image_picker            # File picker
flutter pub add percent_indicator       # Progress
```

### React Native + Capacitor

```bash
npm install @supabase/supabase-js
npm install @capacitor/geolocation
npm install @capacitor/camera
npm install @react-native-community/async-storage
```

---

## 🧪 Testing

```dart
// Test login
test('Driver dapat login', () async {
  final res = await supabase.auth.signInWithPassword(
    email: 'test@example.com',
    password: 'password123',
  );
  expect(res.user, isNotNull);
});

// Test profile update
test('Profile dapat diupdate', () async {
  await supabase.from('profiles').update({
    'full_name': 'Updated Name',
  }).eq('id', userId);
  
  final profile = await supabase
    .from('profiles')
    .select()
    .eq('id', userId)
    .single();
    
  expect(profile['full_name'], 'Updated Name');
});
```

---

## 🆘 Troubleshooting

### Error: "JWT expired"

**Solusi**: Token session sudah expired, user harus login ulang

### Error: "Unauthorized"

**Solusi**: User bukan driver (missing role), atau tidak login

### Error: "Storage bucket not found"

**Solusi**: Pastikan path file benar dan bucket sudah dibuat

### Location tidak update

**Solusi**:

- Cek permission di AndroidManifest.xml
- Gunakan device fisik, bukan emulator (emulator GPS tidak akurat)

---

## 📞 Support

- 📖 **Docs**: Baca
  [MOBILE_IMPLEMENTATION_GUIDES.md](./MOBILE_IMPLEMENTATION_GUIDES.md)
- 🐛 **Bug?**: Cek Supabase error logs
- 💬 **Questions**: Lihat contoh di folder [examples/](./examples/)

---

## ✅ Checklist Siap Deploy

- [ ] Authentication flow bekerja
- [ ] Profile load dengan benar
- [ ] Upload dokumen berfungsi
- [ ] Location tracking accurate
- [ ] Offline mode handled
- [ ] Error handling implemented
- [ ] APK build success
- [ ] Tested di device fisik

---

## 🎉 Next Steps

1. **Setup Flutter/React Native project** (5 menit)
2. **Implement login screen** (1 jam)
3. **Create profile screen** (1 jam)
4. **Add location tracking** (1 jam)
5. **Upload dokumen** (30 menit)
6. **Test semua fitur** (1 jam)
7. **Build & deploy APK** (30 menit)

**Total: ~5 jam untuk MVP!** 🚀

---

Selamat coding! Jika ada pertanyaan, baca dokumentasi lengkap atau lihat contoh
kode di masing-masing file API.

**Happy coding! 💪**

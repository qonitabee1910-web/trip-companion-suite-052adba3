

# Plan: Pindahkan Kapasitas Kursi dari Vehicles ke Seat Editor + Hapus Harga Dasar

## Analisis Singkat

**Saat ini di `/admin/shuttle/vehicles`:**
- `VehicleType` punya `totalSeats` (kapasitas) & `basePrice` (harga dasar) — keduanya jadi sumber inkonsistensi karena seat layout di seat-editor punya jumlah kursi sendiri (count of seats di layout).

**Yang user inginkan:**
- Hapus input "Kapasitas Kursi" & "Harga Dasar" dari `/admin/shuttle/vehicles`.
- Pindahkan kapasitas kursi ke `/admin/shuttle/seat-editor` (per kombinasi vehicle × tier), sehingga **kapasitas = jumlah kursi di layout** (sumber tunggal).
- Fare calculation konsisten di semua tempat.

## Pertanyaan Klarifikasi (perlu dijawab sebelum implement)
<lov-tool-use id="toolu_vrtx_01C9UdCJ56ndffaN8bxrDHGp" name="questions--ask_questions" requires-approval="true" integration-id="questions" data="{\"questions\": [{\"header\":\"Harga Dasar\",\"question\":\"Harga Dasar (basePrice) saat ini dihapus dari Vehicles. Di mana sebaiknya harga ditentukan agar fare calculation tetap jalan?\",\"options\":[{\"label\":\"Pindah ke Seat Editor per (vehicle × tier)\",\"description\":\"Tiap kombinasi kendaraan + service punya harga sendiri. Paling fleksibel, cocok karena exec biasanya lebih mahal dari reguler.\"},{\"label\":\"Pindah ke Service Tiers\",\"description\":\"Harga ditentukan per tier (reguler/semi/exec) saja, sama untuk semua kendaraan.\"},{\"label\":\"Tetap ada di Vehicles, hanya hapus 'Kapasitas Kursi'\",\"description\":\"Harga dasar tetap di Vehicles, hanya kapasitas yang dipindah ke seat editor.\"}],\"multiSelect\":false,\"allowOther\":true},{\"header\":\"Field kapasitas di Seat Editor\",\"question\":\"Bagaimana cara field 'Kapasitas Kursi' bekerja di Seat Editor?\",\"options\":[{\"label\":\"Read-only (auto = jumlah kursi di layout)\",\"description\":\"Tampilkan jumlah kursi yang sudah didrag di layout. Tidak bisa diedit manual — kapasitas selalu = layout aktual. Paling konsisten.\"},{\"label\":\"Editable, validasi harus = jumlah kursi\",\"description\":\"Admin set angka target, dan disable Save kalau jumlah kursi di layout belum cocok.\"},{\"label\":\"Editable bebas, independen dari layout\",\"description\":\"Admin bisa set angka apapun, layout & kapasitas terpisah.\"}],\"multiSelect\":false,\"allowOther\":true}]}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VmnCiVMSPgFVQsrnv6FhaQ" name="questions--ask_questions" requires-approval="true" integration-id="questions" data="{\"questions\": [{\"allowOther\":true,\"header\":\"Harga Dasar\",\"multiSelect\":false,\"options\":[{\"description\":\"Tiap kombinasi kendaraan + service punya harga sendiri. Cocok karena exec biasanya lebih mahal dari reguler.\",\"label\":\"Pindah ke Seat Editor per (vehicle × tier)\"},{\"description\":\"Harga ditentukan per tier (reguler/semi/exec) saja, sama untuk semua kendaraan.\",\"label\":\"Pindah ke Service Tiers\"},{\"description\":\"Harga dasar tetap di Vehicles, hanya kapasitas yang dipindah ke seat editor.\",\"label\":\"Tetap ada di Vehicles, hanya hapus 'Kapasitas Kursi'\"}],\"question\":\"Harga Dasar (basePrice) — di mana sebaiknya ditentukan agar fare calculation tetap jalan?\"},{\"allowOther\":true,\"header\":\"Field kapasitas di Seat Editor\",\"multiSelect\":false,\"options\":[{\"description\":\"Tampilkan jumlah kursi di layout. Tidak bisa diedit manual — kapasitas selalu = layout aktual. Paling konsisten.\",\"label\":\"Read-only (auto = jumlah kursi di layout)\"},{\"description\":\"Admin set angka target, dan disable Save kalau jumlah kursi di layout belum cocok.\",\"label\":\"Editable, validasi harus = jumlah kursi\"},{\"description\":\"Admin bisa set angka apapun, layout & kapasitas terpisah.\",\"label\":\"Editable bebas, independen dari layout\"}],\"question\":\"Bagaimana cara field 'Kapasitas Kursi' bekerja di Seat Editor?\"}]}">
</lov-tool-use>

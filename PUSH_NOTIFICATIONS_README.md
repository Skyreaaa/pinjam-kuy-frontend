# 🔔 Push Notifications untuk Pinjam Kuy

## 📋 Fitur Push Notifications

Push notifications telah diimplementasikan menggunakan **Web Push Notifications API** yang memungkinkan:

✅ **Notifikasi muncul di sistem operasi** (Windows, macOS, Android, iOS)  
✅ **Berfungsi bahkan saat aplikasi tidak dibuka**  
✅ **Logo aplikasi "Pinjam Kuy" di notifikasi**  
✅ **Format: "Pemberitahuan" + detail informasi**  
✅ **Dukungan desktop & mobile (semua browser modern)**

---

## 🎯 Kapan Notifikasi Dikirim?

### Untuk User (Peminjam):
1. **📚 Saat buku diambil** - Admin scan QR, user dapat notifikasi bahwa buku berhasil diambil
2. **⏰ Pengingat jatuh tempo** - Admin kirim reminder, user dapat notifikasi pengingat
3. **💰 Notifikasi denda** - Jika terlambat, user dapat notifikasi peringatan denda
4. **✅ Update status peminjaman** - Persetujuan, penolakan, dll

### Untuk Admin:
1. **👥 Peminjaman baru** - User request pinjam, admin dapat notifikasi ada peminjaman baru
2. **📝 Update sistem** - Broadcast dari sistem

---

## 🚀 Cara Menggunakan

### 1. Generate VAPID Keys (Hanya Sekali)

VAPID keys diperlukan untuk keamanan push notifications. Jalankan di terminal backend:

```bash
cd be-pinjam-rev-main
npx web-push generate-vapid-keys
```

**Output contoh:**
```
Public Key:
BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBr3O9QWdoKLGFXZq5Uk

Private Key:
UUxI4O8-FbRouAevSmBQ6O8hhIHI3bxmVMWrXrCyxiQ
```

### 2. Update Keys di Backend

Edit file `be-pinjam-rev-main/controllers/pushController.js`:

```javascript
const vapidKeys = {
  publicKey: 'PASTE_YOUR_PUBLIC_KEY_HERE',
  privateKey: 'PASTE_YOUR_PRIVATE_KEY_HERE'
};
```

**ATAU** tambahkan di `.env` (lebih aman):

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

### 3. Update Public Key di Frontend

Edit file `src/utils/pushNotifications.ts`:

```typescript
const VAPID_PUBLIC_KEY = 'PASTE_YOUR_PUBLIC_KEY_HERE';
```

### 4. Install Dependencies

Backend:
```bash
cd be-pinjam-rev-main
npm install web-push
```

Frontend (sudah otomatis, tidak perlu library tambahan)

### 5. Restart Server

```bash
# Backend
cd be-pinjam-rev-main
npm start

# Frontend (terminal baru)
npm start
```

---

## 📱 Cara Mengaktifkan Push Notifications

### Untuk User:

1. Login ke akun user
2. Setelah 5 detik, akan muncul popup **"Aktifkan Notifikasi Push?"**
3. Klik **"✓ Aktifkan Sekarang"**
4. Browser akan meminta izin notifikasi → Klik **"Allow"**
5. Selesai! User akan menerima notifikasi push

### Untuk Admin:

1. Login ke akun admin
2. Popup akan muncul setelah 5 detik
3. Klik **"✓ Aktifkan Sekarang"**
4. Izinkan notifikasi di browser
5. Selesai! Admin akan menerima notifikasi saat ada peminjaman baru

---

## 🧪 Testing Push Notifications

### Test 1: User Pinjam Buku (Admin dapat notifikasi)

1. Login sebagai **user**
2. Pilih buku → Klik "Pinjam"
3. **Admin** (jika sudah aktifkan push) akan dapat notifikasi push:
   ```
   Pemberitahuan
   Permintaan pinjam baru: Buku "Judul Buku" oleh user ID 123
   ```

### Test 2: Admin Scan QR (User dapat notifikasi)

1. User sudah pinjam buku, ada QR code
2. Login sebagai **admin**
3. Scan QR code di halaman admin
4. **User** (jika sudah aktifkan push) akan dapat notifikasi:
   ```
   Pemberitahuan
   Buku "Judul Buku" telah diambil dan siap dipinjam. Selamat membaca!
   ```

### Test 3: Admin Kirim Reminder (User dapat notifikasi)

1. Login sebagai **admin**
2. Buka halaman **"Peminjaman Aktif"**
3. Klik tombol **"🔔 Kirim Pengingat"** pada card peminjaman
4. **User** akan dapat push notification:
   ```
   Pemberitahuan
   📅 Pengingat: Buku "Judul Buku" akan jatuh tempo dalam X hari. Harap kembalikan tepat waktu.
   ```

---

## 🔧 Troubleshooting

### Notifikasi tidak muncul?

1. **Cek izin browser:**
   - Chrome: Klik ikon gembok di address bar → Site settings → Notifications → Allow
   - Firefox: Klik ikon ℹ️ di address bar → Permissions → Notifications → Allow

2. **Cek Do Not Disturb (Windows/Mac):**
   - Windows: Settings → System → Notifications → Off
   - Mac: System Preferences → Notifications → Do Not Disturb → Off

3. **Cek Service Worker:**
   - Buka DevTools (F12)
   - Tab "Application" → "Service Workers"
   - Pastikan `service-worker.js` status "activated"

4. **Cek VAPID Keys:**
   - Pastikan Public Key di backend sama dengan frontend
   - Pastikan tidak ada spasi atau karakter tambahan

### Browser tidak support?

Push notifications didukung di:
- ✅ Chrome/Edge (desktop & mobile)
- ✅ Firefox (desktop & mobile)
- ✅ Safari 16+ (macOS 13+, iOS 16.4+)
- ❌ Internet Explorer (tidak support)

### Testing di localhost?

Push notifications **bisa** di localhost:
- Chrome/Firefox: ✅ Support localhost
- Safari: ⚠️ Butuh HTTPS (gunakan ngrok atau deploy)

---

## 📊 Database Storage (Opsional)

Untuk production, sebaiknya simpan subscriptions di database MySQL. Buat tabel:

```sql
CREATE TABLE push_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  role ENUM('user', 'admin') NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role)
);
```

Update `controllers/pushController.js` untuk save/load dari database.

---

## 🎨 Customisasi Notifikasi

Edit `public/service-worker.js` untuk mengubah:

```javascript
// Ubah logo notifikasi
icon: '/logo192.png',  // Ganti dengan path logo Anda

// Ubah durasi notifikasi
requireInteraction: true,  // Notifikasi tidak hilang otomatis

// Tambah tombol action
actions: [
  { action: 'view', title: 'Lihat Detail' },
  { action: 'dismiss', title: 'Tutup' }
]
```

---

## 🔐 Keamanan

- VAPID keys **JANGAN** commit ke Git
- Simpan di `.env` atau environment variables
- Public key boleh di frontend (tidak masalah)
- Private key **HANYA** di backend (jangan expose)

---

## 📚 Resources

- [Web Push Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Service Workers Guide](https://developers.google.com/web/fundamentals/primers/service-workers)
- [web-push Library](https://github.com/web-push-libs/web-push)

---

**🎉 Sekarang aplikasi Pinjam Kuy sudah punya notifikasi push seperti app native!**

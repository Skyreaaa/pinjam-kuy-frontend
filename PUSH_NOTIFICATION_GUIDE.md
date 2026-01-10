# 📱 Push Notification Guide - Pinjam Kuy

## Fitur Push Notification seperti WhatsApp & Instagram

Push notification sudah terintegrasi penuh di aplikasi Pinjam Kuy. Notifikasi akan muncul di device user bahkan saat aplikasi tidak dibuka.

---

## 🎯 Cara Kerja

### Untuk USER:
1. **Login pertama kali** → Popup otomatis muncul meminta izin enable push notification
2. **Klik "Enable"** → Push notification aktif
3. **Notifikasi akan muncul** di device saat:
   - Admin broadcast pesan
   - Peminjaman disetujui/ditolak
   - Buku jatuh tempo (reminder)
   - Denda dikenakan
   - Dan notifikasi lainnya

### Untuk ADMIN:
1. **Masuk ke halaman "Broadcast"**
2. **Test dulu**: Klik tombol **"🔔 Test Push"** untuk memastikan browser Anda bisa menampilkan notifikasi
3. **Kirim Broadcast**:
   - Tulis pesan
   - Pilih tipe (info/success/warning/error)
   - Pilih user tertentu atau broadcast ke semua
   - Klik "Kirim"
4. **Push notification otomatis dikirim** ke semua user yang sudah enable

---

## ✅ Checklist Setup (Sudah Selesai)

- ✅ Service Worker ter-register
- ✅ Backend push controller terintegrasi
- ✅ VAPID keys sudah dikonfigurasi
- ✅ Broadcast admin mengirim push notification
- ✅ Frontend prompt untuk enable push
- ✅ Notifikasi muncul di browser & device

---

## 🔧 Troubleshooting

### Push notification tidak muncul?

1. **Cek Browser Permission:**
   - Klik icon gembok/info di address bar
   - Pilih "Site settings"
   - Pastikan "Notifications" di-set ke **"Allow"**

2. **Test dengan tombol "Test Push":**
   - Masuk sebagai admin
   - Buka halaman Broadcast
   - Klik tombol "🔔 Test Push"
   - Jika muncul = browser OK ✅
   - Jika tidak muncul = cek settings browser

3. **Restart Backend:**
   - Pastikan backend sudah running
   - Cek terminal backend untuk log error

4. **Check Console Browser (F12):**
   - Lihat tab Console
   - Cari log dengan emoji 🔔
   - Lihat status subscription

---

## 📊 Log Backend yang Benar

Saat broadcast berhasil, akan muncul log:
```
📢 [BROADCAST] Received request: { message: '...', type: 'info' }
📢 [BROADCAST] IO available: true
📤 [PUSH] Sending to all users, total subscriptions: 5
📤 [PUSH] Checking subscription key: user_1
📤 [PUSH] Sending to user 1
✅ Sent push to 5 users. Success: 5, Failed: 0
✅ Push notification broadcast berhasil dikirim ke semua user
```

---

## 🎨 Customization

Push notification bisa di-customize di:
- **Backend**: `be-pinjam-rev-main/controllers/pushController.js`
- **Service Worker**: `public/service-worker.js`
- **Frontend Subscribe**: `src/utils/pushNotifications.ts`

---

## 📱 Browser Support

Push notification didukung di:
- ✅ Chrome (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Edge (Desktop)
- ✅ Safari (macOS 16+, iOS 16.4+)
- ❌ iOS Safari < 16.4

---

**Push notification sudah siap digunakan!** 🎉

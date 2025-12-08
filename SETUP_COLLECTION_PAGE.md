# Setup Instructions - PinjamKuy

## Database Migration

Untuk menambahkan kolom description ke tabel books, jalankan migration berikut:

```sql
-- Run this in your MySQL database
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS description TEXT NULL 
AFTER location;
```

Atau gunakan file migration:
```bash
mysql -u root -p pinjam_kuy < be-pinjam-master/sql/migrations/20251207_add_description_to_books.sql
```

## Fitur Baru yang Ditambahkan

### 1. **Halaman Koleksi Buku (BookCollectionPage)**
   - **URL**: `/collection` (public, tanpa login)
   - **Fitur**:
     - Tampilkan semua buku dari database
     - Filter berdasarkan kategori (Fiksi, Non-Fiksi, Sains, Sejarah, Komputer, Jurnal, Lainnya)
     - Search berdasarkan judul dan penulis
     - Tampilkan detail buku (judul, penulis, kategori, tahun terbit, penerbit, lokasi, stok, deskripsi)
     - Button "Masuk untuk Meminjam" → redirect ke halaman login
   - **Tujuan**: User bisa melihat koleksi dan stok buku tanpa harus login, tapi harus login untuk meminjam

### 2. **Field Kategori di Admin Dashboard**
   - Sudah ada di `BookModal.tsx`
   - Kategori yang tersedia: Fiksi, Non-Fiksi, Sains, Sejarah, Komputer, Jurnal, Lainnya
   - Field kategori wajib diisi saat tambah/edit buku

### 3. **Field Deskripsi Buku**
   - Tambahkan di `BookModal.tsx` (textarea)
   - Tambahkan kolom `description` di database (gunakan migration di atas)
   - Backend sudah support di `bookController.js`

### 4. **Navigasi Landing Page**
   - Button "Lihat Semua Koleksi" di landing page → redirect ke `/collection`
   - Di halaman collection, ada button "Kembali" ke landing page
   - Di halaman collection, ada button "Masuk untuk Pinjam" → redirect ke login

## Flow User

### Tanpa Login (Public):
1. Landing Page → Lihat preview 6 buku populer
2. Klik "Lihat Semua Koleksi" → Halaman Koleksi Buku
3. Filter kategori, search buku
4. Klik buku → Lihat detail (judul, penulis, stok, deskripsi, dll)
5. Klik "Masuk untuk Meminjam" → Redirect ke Login

### Setelah Login:
1. Home Dashboard
2. Klik "Pinjam Buku" → Scan QR atau pilih buku
3. Proses peminjaman normal

## Koneksi Database

Pastikan backend sudah terkoneksi dengan database:

1. Cek file `be-pinjam-master/config/config.js`
2. Pastikan kredensial database benar:
   ```javascript
   DB_HOST: 'localhost'
   DB_USER: 'root'
   DB_PASSWORD: '' // atau password MySQL Anda
   DB_NAME: 'pinjam_kuy'
   ```

3. Test koneksi:
   ```bash
   cd be-pinjam-master
   npm start
   ```

4. Cek log: Harus ada pesan "✅ Database connected successfully"

## Testing

### Test Halaman Koleksi:
1. Buka browser: `http://localhost:3000`
2. Di landing page, klik "Lihat Semua Koleksi"
3. Pastikan buku dari database tampil
4. Test filter kategori
5. Test search
6. Klik detail buku
7. Klik "Masuk untuk Meminjam" → harus redirect ke login

### Test Admin (Tambah Buku dengan Kategori):
1. Login sebagai admin
2. Buka Admin Dashboard
3. Klik "Tambah Buku"
4. Isi semua field termasuk kategori dan deskripsi
5. Upload cover buku
6. Save
7. Buku baru harus muncul di halaman koleksi

## Troubleshooting

### Buku tidak muncul di landing/collection:
1. Cek koneksi database backend
2. Cek console browser (F12) untuk error API
3. Cek backend log untuk error
4. Pastikan ada data buku di database: `SELECT * FROM books;`

### Gambar buku tidak muncul:
1. Cek folder `be-pinjam-master/uploads/book-covers/`
2. Pastikan backend serve static files dengan benar
3. Cek URL gambar di response API (harus full URL: `http://localhost:5000/uploads/book-covers/...`)

### Error kategori tidak tersimpan:
1. Cek database schema: `DESCRIBE books;`
2. Pastikan kolom `category` ada (VARCHAR)
3. Jalankan migration jika perlu

## File yang Dimodifikasi/Dibuat

### Frontend:
- ✅ `src/components/BookCollection/BookCollectionPage.tsx` (BARU)
- ✅ `src/components/BookCollection/BookCollectionPage.css` (BARU)
- ✅ `src/components/LandingPage/LandingPage.tsx` (MODIFIED)
- ✅ `src/App.tsx` (MODIFIED - tambah routing)
- ✅ `src/components/DashboardAdmin/BookModal.tsx` (SUDAH ADA field kategori)

### Backend:
- ✅ `be-pinjam-master/controllers/bookController.js` (SUDAH SUPPORT category & description)
- ✅ `be-pinjam-master/sql/migrations/20251207_add_description_to_books.sql` (BARU)

### Database:
- ✅ Tabel `books` sudah punya kolom `category`
- ⚠️ Perlu tambah kolom `description` (gunakan migration)

## Next Steps

1. Jalankan migration untuk menambah kolom `description`
2. Test semua fitur
3. Tambahkan sample data buku dengan kategori yang beragam
4. (Optional) Tambahkan pagination di halaman koleksi jika buku > 100

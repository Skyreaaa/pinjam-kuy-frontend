-- Migration: Memastikan semua field buku ada di tabel books
-- Tanggal: 2026-01-01
-- Deskripsi: Menambahkan kolom yang mungkin belum ada (termasuk program studi, bahasa, jenis koleksi, lampiran, pemusatan materi)

-- Tambahkan kolom publisher jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publisher VARCHAR(255) DEFAULT NULL
AFTER author;

-- Tambahkan kolom publicationYear jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publicationYear INT DEFAULT NULL
AFTER publisher;

-- Tambahkan kolom category jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Lainnya'
AFTER availableStock;

-- Tambahkan kolom image_url jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS image_url VARCHAR(255) DEFAULT NULL
AFTER category;

-- Tambahkan kolom location jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT NULL
AFTER image_url;

-- Tambahkan kolom description jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL
AFTER location;

-- Tambahkan kolom pages (jumlah halaman) jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS pages INT DEFAULT NULL
AFTER description;

-- ===== FIELD BARU DARI FILTER =====

-- Tambahkan kolom programStudi jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS programStudi VARCHAR(100) DEFAULT NULL
AFTER pages;

-- Tambahkan kolom bahasa jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS bahasa VARCHAR(50) DEFAULT 'Bahasa Indonesia'
AFTER programStudi;

-- Tambahkan kolom jenisKoleksi jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS jenisKoleksi VARCHAR(50) DEFAULT 'Buku Asli'
AFTER bahasa;

-- Tambahkan kolom lampiran jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS lampiran VARCHAR(50) DEFAULT 'Tidak Ada'
AFTER jenisKoleksi;

-- Tambahkan kolom attachment_url untuk file lampiran jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) DEFAULT NULL
AFTER lampiran;

-- Tambahkan kolom pemusatanMateri jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS pemusatanMateri VARCHAR(100) DEFAULT NULL
AFTER attachment_url;

-- Tambahkan kolom createdAt jika belum ada
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
AFTER pemusatanMateri;

-- Update data yang kosong dengan default values
UPDATE books SET category = 'Lainnya' WHERE category IS NULL OR category = '';
UPDATE books SET location = 'Belum Ditentukan' WHERE location IS NULL OR location = '';
UPDATE books SET bahasa = 'Bahasa Indonesia' WHERE bahasa IS NULL OR bahasa = '';
UPDATE books SET jenisKoleksi = 'Buku Asli' WHERE jenisKoleksi IS NULL OR jenisKoleksi = '';
UPDATE books SET lampiran = 'Tidak Ada' WHERE lampiran IS NULL OR lampiran = '';

-- Tampilkan struktur tabel setelah migration
DESCRIBE books;

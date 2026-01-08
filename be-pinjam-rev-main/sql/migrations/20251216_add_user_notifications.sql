-- Migration: Notifikasi broadcast ke semua user
-- Tanggal: 2025-12-16
-- Deskripsi: Menambah tabel user_notifications untuk menyimpan history notifikasi (termasuk broadcast)

CREATE TABLE IF NOT EXISTS user_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  is_broadcast TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Untuk broadcast, user_id NULL dan is_broadcast=1. Untuk notifikasi personal, user_id diisi.

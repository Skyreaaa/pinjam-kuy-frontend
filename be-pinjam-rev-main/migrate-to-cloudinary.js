// Script migrasi file lokal ke Cloudinary dan update database
// Jalankan: node migrate-to-cloudinary.js

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Konfigurasi Cloudinary dari .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Konfigurasi koneksi database
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
});

// Helper upload file ke Cloudinary
async function uploadToCloudinary(localPath, folder) {
  try {
    const result = await cloudinary.uploader.upload(localPath, {
      folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    return result.secure_url;
  } catch (e) {
    console.error('Cloudinary upload error:', e.message);
    return null;
  }
}

async function migrateProfilePhotos() {
  const [rows] = await db.query("SELECT id, npm, profile_photo_url FROM users WHERE profile_photo_url IS NOT NULL AND profile_photo_url NOT LIKE 'http%'");
  for (const user of rows) {
    let relPath = user.profile_photo_url.replace(/^\/+/, '');
    let localPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(localPath)) {
      // Coba di uploads/profile
      localPath = path.join(__dirname, '..', 'uploads', 'profile', path.basename(relPath));
    }
    if (fs.existsSync(localPath)) {
      const url = await uploadToCloudinary(localPath, 'profile-photos');
      if (url) {
        await db.query('UPDATE users SET profile_photo_url=? WHERE id=?', [url, user.id]);
        console.log(`[OK] User ${user.npm}: migrated to ${url}`);
      } else {
        console.log(`[FAIL] User ${user.npm}: upload failed for ${localPath}`);
      }
    } else {
      console.log(`[NOT FOUND] User ${user.npm}: file not found ${localPath}`);
    }
  }
}

async function migrateBookCovers() {
  const [rows] = await db.query("SELECT id, image_url FROM books WHERE image_url IS NOT NULL AND image_url NOT LIKE 'http%'");
  for (const book of rows) {
    let relPath = book.image_url.replace(/^\/+/, '');
    let localPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(localPath)) {
      // Coba di uploads/book-covers
      localPath = path.join(__dirname, '..', 'uploads', 'book-covers', path.basename(relPath));
    }
    if (fs.existsSync(localPath)) {
      const url = await uploadToCloudinary(localPath, 'book-covers');
      if (url) {
        await db.query('UPDATE books SET image_url=? WHERE id=?', [url, book.id]);
        console.log(`[OK] Book ${book.id}: migrated to ${url}`);
      } else {
        console.log(`[FAIL] Book ${book.id}: upload failed for ${localPath}`);
      }
    } else {
      console.log(`[NOT FOUND] Book ${book.id}: file not found ${localPath}`);
    }
  }
}

async function migrateReturnProofs() {
  const [rows] = await db.query("SELECT id, returnProofUrl FROM loans WHERE returnProofUrl IS NOT NULL AND returnProofUrl NOT LIKE 'http%'");
  for (const loan of rows) {
    let relPath = loan.returnProofUrl.replace(/^\/+/, '');
    let localPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(localPath)) {
      // Coba di uploads/fine-proofs
      localPath = path.join(__dirname, '..', 'uploads', 'fine-proofs', path.basename(relPath));
    }
    if (fs.existsSync(localPath)) {
      const url = await uploadToCloudinary(localPath, 'return-proofs');
      if (url) {
        await db.query('UPDATE loans SET returnProofUrl=? WHERE id=?', [url, loan.id]);
        console.log(`[OK] Loan ${loan.id}: migrated to ${url}`);
      } else {
        console.log(`[FAIL] Loan ${loan.id}: upload failed for ${localPath}`);
      }
    } else {
      console.log(`[NOT FOUND] Loan ${loan.id}: file not found ${localPath}`);
    }
  }
}

async function migrateFineProofs() {
  const [rows] = await db.query("SELECT id, finePaymentProof FROM loans WHERE finePaymentProof IS NOT NULL AND finePaymentProof NOT LIKE 'http%'");
  for (const loan of rows) {
    let relPath = loan.finePaymentProof.replace(/^\/+/, '');
    let localPath = path.join(__dirname, '..', relPath);
    if (!fs.existsSync(localPath)) {
      // Coba di uploads/fine-proofs
      localPath = path.join(__dirname, '..', 'uploads', 'fine-proofs', path.basename(relPath));
    }
    if (fs.existsSync(localPath)) {
      const url = await uploadToCloudinary(localPath, 'fine-proofs');
      if (url) {
        await db.query('UPDATE loans SET finePaymentProof=? WHERE id=?', [url, loan.id]);
        console.log(`[OK] Loan ${loan.id} fine proof: migrated to ${url}`);
      } else {
        console.log(`[FAIL] Loan ${loan.id} fine proof: upload failed for ${localPath}`);
      }
    } else {
      console.log(`[NOT FOUND] Loan ${loan.id} fine proof: file not found ${localPath}`);
    }
  }
}

async function main() {
  await migrateProfilePhotos();
  await migrateBookCovers();
  await migrateReturnProofs();
  await migrateFineProofs();
  console.log('Migrasi selesai!');
  process.exit(0);
}

main().catch(e => {
  console.error('Migration error:', e);
  process.exit(1);
});

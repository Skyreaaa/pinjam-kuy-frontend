require('dotenv').config();
// File: routes/bookRoutes.js (FULL CODE FIXED & LENGKAP)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const path = require('path');
const multer = require('multer');
const { uploadBookCover, uploadAttachment } = require('../middleware/upload');
const bookController = require('../controllers/bookController'); 

const getDBPool = (req) => req.app.get('dbPool');

// --- Middleware Otentikasi Pengguna & Admin ---
if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET wajib di-set di .env!'); }
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) { return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' }); }
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) { return res.status(401).json({ message: 'Token tidak valid.' }); }
        req.user = decoded; 
        next();
    });
};

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) { return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' }); }
    
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) { return res.status(401).json({ message: 'Token tidak valid.' }); }
        if (decoded.role !== 'admin') { return res.status(403).json({ message: 'Akses Ditolak. Anda bukan Admin.' }); }
        req.user = decoded; 
        next();
    });
};

// Upload Cloudinary sudah di-setup di middleware/upload.js

// =========================================================
//                  RUTE ADMINISTRATOR (CRUD BUKU)
// =========================================================

// =========================================================
//                  RUTE ADMINISTRATOR (CRUD BUKU)
// =========================================================

// Setup untuk multiple file uploads (coverImage dan attachmentFile)
const uploadMultiple = require('multer')();
const uploadFields = uploadMultiple.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'attachmentFile', maxCount: 1 }
]);

// Custom middleware untuk process cover dan attachment ke Cloudinary
const processBookFiles = async (req, res, next) => {
    try {
        console.log('📂 [UPLOAD] Processing files...', { 
            hasCover: !!(req.files && req.files.coverImage),
            hasAttachment: !!(req.files && req.files.attachmentFile)
        });

        // Process cover image jika ada
        if (req.files && req.files.coverImage) {
            const coverFile = req.files.coverImage[0];
            const cloudinary = require('cloudinary').v2;
            
            // Upload buffer ke Cloudinary
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'book-covers', resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(coverFile.buffer);
            });
            
            const result = await uploadPromise;
            req.coverUrl = result.secure_url;
            console.log('✅ [UPLOAD] Cover uploaded:', req.coverUrl);
        }
        
        // Process attachment file jika ada
        if (req.files && req.files.attachmentFile) {
            const attachFile = req.files.attachmentFile[0];
            const cloudinary = require('cloudinary').v2;
            
            // Upload buffer ke Cloudinary dengan resource_type auto
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'book-attachments', resource_type: 'auto' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(attachFile.buffer);
            });
            
            const result = await uploadPromise;
            req.attachmentUrl = result.secure_url;
            console.log('✅ [UPLOAD] Attachment uploaded:', req.attachmentUrl);
        }
        
        next();
    } catch (error) {
        console.error('❌ [UPLOAD] Error uploading files to Cloudinary:', error);
        res.status(500).json({ message: 'Gagal upload file ke Cloudinary', error: error.message });
    }
};

// POST /api/books - Tambah Buku Baru (dengan support multiple files)
router.post('/', authenticateAdmin, uploadFields, processBookFiles, bookController.createBook);

// PUT /api/books/:id - Edit Data Buku (dengan support multiple files)
router.put('/:id', authenticateAdmin, uploadFields, processBookFiles, bookController.updateBook);

// DELETE /api/books/:id - Hapus Buku (dengan cek pinjaman aktif)
router.delete('/:id', authenticateAdmin, bookController.deleteBook);


// =========================================================
//                       RUTE PUBLIC (TANPA AUTH)
// =========================================================

// GET /api/books/public - PUBLIC endpoint untuk daftar buku (tanpa auth)
// HARUS DI ATAS /:id agar tidak ter-catch sebagai :id
router.get('/public', bookController.getAllBooks); 

// GET /api/books/public/:id - PUBLIC endpoint untuk detail buku (tanpa auth)
router.get('/public/:id', bookController.getBookById);


// =========================================================
//                       RUTE PROTECTED (DENGAN AUTH)
// =========================================================

// GET /api/books - Mendapatkan Daftar Semua Buku (dengan filter search/kategori) - PROTECTED
router.get('/', authenticateUser, bookController.getAllBooks); 

// GET /api/books/:id - Mendapatkan Detail Buku - PROTECTED
router.get('/:id', authenticateUser, bookController.getBookById);

module.exports = router;
// File: controllers/bookController.js (BARU - FULL CODE CRUD BUKU + LOKASI)

const getDBPool = (req) => req.app.get('dbPool');
const fs = require('fs/promises');
const path = require('path');
const BASE_UPLOAD_PATH = path.join(__dirname, '..', 'uploads', 'book-covers');
// BASE_URL dihapus: gunakan host dinamis dari request agar bisa diakses dari perangkat lain di jaringan LAN.
// Helper untuk membentuk origin dinamis.
const getOrigin = (req) => {
    const proto = req.protocol;
    const host = req.get('host');
    return `${proto}://${host}`;
};

// Helper: Hapus Gambar Lama
const deleteOldImage = async (imageFileName) => {
    if (!imageFileName) return;
    // Asumsi imageFileName adalah 'book-cover-12345.jpg'
    const imagePath = path.join(BASE_UPLOAD_PATH, imageFileName);
    try {
        await fs.unlink(imagePath);
        console.log(`✅ Gambar lama berhasil dihapus: ${imagePath}`);
    } catch (err) {
        if (err.code !== 'ENOENT') { // Abaikan error jika file tidak ditemukan
            console.error(`❌ Gagal menghapus gambar lama ${imagePath}:`, err);
        }
    }
};

// =========================================================
//                       CRUD BUKU
// =========================================================

// 1. Mendapatkan Semua Buku (GET /api/books)
exports.getAllBooks = async (req, res) => {
    const pool = getDBPool(req);
    const { search, category, sort } = req.query; 

    // popular: based on total loans count (descending)
    // newest: based on publicationYear (desc) then id desc
    let baseSelect = `SELECT b.id, b.title, b.kodeBuku, b.author, b.publisher, b.publicationYear, b.totalStock, b.availableStock, b.category, b.image_url, b.location, b.description, b.programStudi, b.bahasa, b.jenisKoleksi, b.lampiran, b.attachment_url, b.pemusatanMateri, b.pages,
        (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id) AS borrowCount
        FROM books b WHERE 1=1`;
    let params = [];

    if (search) {
        baseSelect += ' AND (b.title LIKE ? OR b.author LIKE ? OR b.kodeBuku LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (category) {
        baseSelect += ' AND b.category = ?';
        params.push(category);
    }

    // Sorting
    if (sort === 'popular') {
        baseSelect += ' ORDER BY borrowCount DESC, b.id DESC';
    } else if (sort === 'newest') {
        baseSelect += ' ORDER BY IFNULL(b.publicationYear,0) DESC, b.id DESC';
    } else {
        baseSelect += ' ORDER BY b.id DESC';
    }

    try {
        const [rows] = await pool.query(baseSelect, params);
        // Gunakan URL Cloudinary langsung (tanpa prefix lokal)
        const booksWithFullPath = rows.map(book => ({
            ...book,
            image_url: book.image_url || null
        }));
        res.json(booksWithFullPath);
    } catch (error) {
        console.error('❌ Error fetching books:', error);
        res.status(500).json({ message: 'Gagal mengambil data buku.' });
    }
};

// 2. Mendapatkan Detail Buku (GET /api/books/:id)
exports.getBookById = async (req, res) => {
    const pool = getDBPool(req);
    const bookId = req.params.id;
    try {
    const [rows] = await pool.query('SELECT id, title, kodeBuku, author, publisher, publicationYear, totalStock, availableStock, category, image_url, location, description, programStudi, bahasa, jenisKoleksi, lampiran, attachment_url, pemusatanMateri, pages FROM books WHERE id = ?', [bookId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }
        const book = rows[0];
    // Gunakan URL Cloudinary langsung
    book.image_url = book.image_url || null;
        res.json(book);
    } catch (error) {
        console.error('❌ Error fetching book by ID:', error);
        res.status(500).json({ message: 'Gagal mengambil detail buku.' });
    }
};

// 3. Menambah Buku Baru (POST /api/books)
exports.createBook = async (req, res) => {
    const pool = getDBPool(req);
    const { title, kodeBuku, author, publisher, publicationYear, totalStock, category, location, description, programStudi, bahasa, jenisKoleksi, lampiran, pemusatanMateri, pages } = req.body;
    
    // Ambil URL Cloudinary dari custom middleware
    const imageUrl = req.coverUrl || null;
    const attachmentUrl = req.attachmentUrl || null;

    console.log('📝 [CREATE BOOK] Request:', { 
        title, 
        kodeBuku, 
        lampiran, 
        hasImage: !!imageUrl, 
        hasAttachment: !!attachmentUrl 
    });

    if (!title || !kodeBuku || !author || !totalStock || !category || !location) {
        return res.status(400).json({ message: 'Semua field wajib diisi, termasuk Kode Buku dan Lokasi.' });
    }

    try {
        // Cek duplikasi Kode Buku
        const [duplicate] = await pool.query('SELECT id FROM books WHERE kodeBuku = ?', [kodeBuku]);
        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'Kode Buku sudah digunakan.' });
        }

        // Dynamically check which columns exist in the books table
        const [columns] = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'books'
        `);
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        // Build dynamic insert query
        const columnsToInsert = ['title', 'kodeBuku', 'author', 'publisher', 'publicationYear', 'totalStock', 'availableStock', 'category', 'image_url', 'description', 'location'];
        const valuesToInsert = [title, kodeBuku, author, publisher || null, publicationYear || null, totalStock, totalStock, category, imageUrl, description || null, location];
        
        // Add optional columns if they exist in the table
        if (existingColumns.includes('programStudi')) {
            columnsToInsert.push('programStudi');
            valuesToInsert.push(programStudi || null);
        }
        if (existingColumns.includes('bahasa')) {
            columnsToInsert.push('bahasa');
            valuesToInsert.push(bahasa || 'Bahasa Indonesia');
        }
        if (existingColumns.includes('jenisKoleksi')) {
            columnsToInsert.push('jenisKoleksi');
            valuesToInsert.push(jenisKoleksi || 'Buku Asli');
        }
        if (existingColumns.includes('lampiran')) {
            columnsToInsert.push('lampiran');
            valuesToInsert.push(lampiran || 'Tidak Ada');
        }
        if (existingColumns.includes('attachment_url')) {
            columnsToInsert.push('attachment_url');
            valuesToInsert.push(attachmentUrl);
        }
        if (existingColumns.includes('pemusatanMateri')) {
            columnsToInsert.push('pemusatanMateri');
            valuesToInsert.push(pemusatanMateri || null);
        }
        if (existingColumns.includes('pages')) {
            columnsToInsert.push('pages');
            valuesToInsert.push(pages || null);
        }

        const insertQuery = `INSERT INTO books (${columnsToInsert.join(', ')}) VALUES (${columnsToInsert.map(() => '?').join(', ')})`;
        console.log('📊 [CREATE BOOK] SQL:', insertQuery);
        console.log('📊 [CREATE BOOK] Values:', valuesToInsert);

        const [result] = await pool.query(insertQuery, valuesToInsert);

        // --- TRIGGER SOCKET.IO NOTIF BUKU BARU ---
        try {
            const io = req.app.get('io');
            if (io) {
                io.emit('notification', {
                    message: `Buku baru "${title}" telah ditambahkan ke koleksi!`,
                    type: 'info',
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif buku baru:', err.message);
        }

        console.log('✅ [CREATE BOOK] Success! Book ID:', result.insertId);
        res.status(201).json({ 
            success: true, 
            message: 'Buku berhasil ditambahkan.', 
            bookId: result.insertId 
        });
    } catch (error) {
        console.error('❌ [CREATE BOOK] Error:', error);
        res.status(500).json({ message: 'Gagal menambahkan buku.', error: error.message });
    }
};

// 4. Memperbarui Buku (PUT /api/books/:id)
exports.updateBook = async (req, res) => {
    const pool = getDBPool(req);
    const bookId = req.params.id;
    const { title, kodeBuku, author, publisher, publicationYear, totalStock, category, location, description, currentImageFileName, programStudi, bahasa, jenisKoleksi, lampiran, pemusatanMateri, pages } = req.body;

    // Ambil URL Cloudinary dari custom middleware
    const newImageUrl = req.coverUrl || null;
    const newAttachmentUrl = req.attachmentUrl || null;

    console.log('📝 [UPDATE BOOK] Request:', { 
        bookId, 
        title, 
        lampiran, 
        hasNewImage: !!newImageUrl, 
        hasNewAttachment: !!newAttachmentUrl 
    });

    if (!title || !kodeBuku || !author || !totalStock || !category || !location) {
        return res.status(400).json({ message: 'Semua field wajib diisi, termasuk Kode Buku dan Lokasi.' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Cek duplikasi Kode Buku (kecuali untuk buku ini sendiri)
        const [duplicate] = await connection.query('SELECT id FROM books WHERE kodeBuku = ? AND id != ?', [kodeBuku, bookId]);
        if (duplicate.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Kode Buku sudah digunakan oleh buku lain.' });
        }
        
        // 2. Ambil data lama
        const [oldBook] = await connection.query('SELECT totalStock, availableStock, image_url, attachment_url FROM books WHERE id = ?', [bookId]);
        if (oldBook.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }
        const { totalStock: oldTotalStock, availableStock: oldAvailableStock, image_url: oldImageUrl, attachment_url: oldAttachmentUrl } = oldBook[0];
        
        const newTotalStock = parseInt(totalStock);
        const stockDifference = newTotalStock - oldTotalStock;
        const newAvailableStock = oldAvailableStock + stockDifference;

        if (newAvailableStock < 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Stok tersedia tidak boleh negatif. Pastikan total stok baru minimal sama dengan jumlah buku yang sedang dipinjam.' });
        }
        
        // Tentukan URL yang akan disimpan (gunakan yang baru jika ada, jika tidak gunakan yang lama)
        const finalImageUrl = newImageUrl || oldImageUrl;
        const finalAttachmentUrl = newAttachmentUrl || oldAttachmentUrl;
        
        // 3. Dynamically check which columns exist in the books table
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'books'
        `);
        const existingColumns = columns.map(col => col.COLUMN_NAME);
        
        // Build dynamic update query
        const updates = [
            'title = ?', 'kodeBuku = ?', 'author = ?', 'publisher = ?', 'publicationYear = ?',
            'totalStock = ?', 'availableStock = ?', 'category = ?', 'image_url = ?',
            'description = ?', 'location = ?'
        ];
        const values = [
            title, kodeBuku, author, publisher || null, publicationYear || null,
            newTotalStock, newAvailableStock, category, finalImageUrl,
            description || null, location
        ];
        
        // Add optional columns if they exist
        if (existingColumns.includes('programStudi')) {
            updates.push('programStudi = ?');
            values.push(programStudi || null);
        }
        if (existingColumns.includes('bahasa')) {
            updates.push('bahasa = ?');
            values.push(bahasa || 'Bahasa Indonesia');
        }
        if (existingColumns.includes('jenisKoleksi')) {
            updates.push('jenisKoleksi = ?');
            values.push(jenisKoleksi || 'Buku Asli');
        }
        if (existingColumns.includes('lampiran')) {
            updates.push('lampiran = ?');
            values.push(lampiran || 'Tidak Ada');
        }
        if (existingColumns.includes('attachment_url')) {
            updates.push('attachment_url = ?');
            values.push(finalAttachmentUrl);
        }
        if (existingColumns.includes('pemusatanMateri')) {
            updates.push('pemusatanMateri = ?');
            values.push(pemusatanMateri || null);
        }
        if (existingColumns.includes('pages')) {
            updates.push('pages = ?');
            values.push(pages || null);
        }
        
        values.push(bookId); // WHERE id = ?
        
        const updateQuery = `UPDATE books SET ${updates.join(', ')} WHERE id = ?`;
        console.log('📊 [UPDATE BOOK] SQL:', updateQuery);
        console.log('📊 [UPDATE BOOK] Values:', values);

        const [result] = await connection.query(updateQuery, values);

        await connection.commit();
        console.log('✅ [UPDATE BOOK] Success! Book ID:', bookId);
        res.json({ success: true, message: 'Buku berhasil diperbarui.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ [UPDATE BOOK] Error:', error);
        res.status(500).json({ message: 'Gagal memperbarui buku.', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// 5. Menghapus Buku (DELETE /api/books/:id)
exports.deleteBook = async (req, res) => {
    const pool = getDBPool(req);
    const bookId = req.params.id;

    try {
        // 1. Cek apakah ada pinjaman aktif (Penting: Logika yang diminta dipertahankan)
        const [activeLoans] = await pool.query('SELECT COUNT(*) as count FROM loans WHERE book_id = ? AND status IN (?, ?, ?)', 
            [bookId, 'Sedang Dipinjam', 'Menunggu Persetujuan', 'Siap Dikembalikan']
        );
        if (activeLoans[0].count > 0) {
            return res.status(400).json({ message: `Tidak dapat menghapus buku. Terdapat ${activeLoans[0].count} pinjaman yang masih aktif (Dipinjam/Tertunda/Siap Dikembalikan).` });
        }

        // 2. Ambil image_url sebelum menghapus data
        const [book] = await pool.query('SELECT image_url FROM books WHERE id = ?', [bookId]);
        
        // 3. Hapus data buku
        const [result] = await pool.query('DELETE FROM books WHERE id = ?', [bookId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }
        
        // 4. Hapus file cover
        if (book.length > 0 && book[0].image_url) {
            await deleteOldImage(book[0].image_url);
        }

        res.json({ success: true, message: 'Buku berhasil dihapus.' });
    } catch (error) {
        console.error('❌ Error deleting book:', error);
        res.status(500).json({ message: 'Gagal menghapus buku.' });
    }
};
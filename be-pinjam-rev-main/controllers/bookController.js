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
    let baseSelect = `SELECT b.id, b.title, b.kodeBuku, b.author, b.publisher, b.publicationYear, 
        b.totalStock AS totalstock, b.availableStock AS availablestock, 
        b.category, b.image_url, b.location, b.description, b.programStudi, b.bahasa, b.jenisKoleksi, b.lampiran, b.attachment_url, b.pemusatanMateri, b.pages,
        (SELECT COUNT(*) FROM loans l WHERE l.book_id = b.id) AS borrowCount
        FROM books b WHERE 1=1`;
    let params = [];
    let paramCount = 1;

    if (search) {
        baseSelect += ` AND (b.title LIKE $${paramCount} OR b.author LIKE $${paramCount+1} OR b.kodeBuku LIKE $${paramCount+2})`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
        paramCount += 3;
    }
    
    if (category) {
        baseSelect += ` AND b.category = $${paramCount}`;
        params.push(category);
        paramCount++;
    }

    // Sorting
    if (sort === 'popular') {
        baseSelect += ' ORDER BY borrowCount DESC, b.id DESC';
    } else if (sort === 'newest') {
        baseSelect += ' ORDER BY COALESCE(b.publicationYear,0) DESC, b.id DESC';
    } else {
        baseSelect += ' ORDER BY b.id DESC';
    }

    try {
        const _pgResult = await pool.query(baseSelect, params);
        const rows = _pgResult.rows;
        // Map to camelCase for frontend compatibility
        const booksWithFullPath = rows.map(book => ({
            id: book.id,
            title: book.title,
            judul: book.title, // Alias
            kodeBuku: book.kodebuku || '',
            author: book.author,
            penulis: book.author, // Alias
            publisher: book.publisher,
            publicationYear: book.publicationyear,
            year: book.publicationyear, // Alias
            totalStock: book.totalstock,
            availableStock: book.availablestock,
            category: book.category,
            image_url: book.image_url || null,
            imageUrl: book.image_url || null, // Alias
            location: book.location,
            description: book.description,
            programStudi: book.programstudi,
            bahasa: book.bahasa,
            jenisKoleksi: book.jeniskoleksi,
            lampiran: book.lampiran,
            attachment_url: book.attachment_url,
            pemusatanMateri: book.pemusatanmateri,
            pages: book.pages,
            borrowCount: book.borrowcount
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
    const _pgResult = await pool.query('SELECT id, title, kodeBuku, author, publisher, publicationYear, totalStock, availableStock, category, image_url, location, description, programStudi, bahasa, jenisKoleksi, lampiran, attachment_url, pemusatanMateri, pages FROM books WHERE id = $1', [bookId]);
        const rows = _pgResult.rows;
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
        const duplicateResult = await pool.query('SELECT id FROM books WHERE kodeBuku = $1', [kodeBuku]);
        if (duplicateResult.rows && duplicateResult.rows.length > 0) {
            return res.status(400).json({ message: 'Kode Buku sudah digunakan.' });
        }

        // Dynamically check which columns exist in the books table
        const columnsResult = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'public' 
            AND TABLE_NAME = 'books'
        `);
        const existingColumns = columnsResult.rows.map(col => col.column_name);
        
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

        const insertQuery = `INSERT INTO books (${columnsToInsert.join(', ')}) VALUES (${columnsToInsert.map(() => '$1').join(', ')})`;
        console.log('📊 [CREATE BOOK] SQL:', insertQuery);
        console.log('📊 [CREATE BOOK] Values:', valuesToInsert);

        const result = await pool.query(insertQuery, valuesToInsert);

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

        console.log('✅ [CREATE BOOK] Success! Book ID:', result.rows[0]?.id);
        res.status(201).json({ 
            success: true, 
            message: 'Buku berhasil ditambahkan.', 
            bookId: result.rows[0]?.id 
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
    
    // PostgreSQL uses pool directly
    try {
        // No getConnection needed
        // No transactions for now

        // 1. Cek duplikasi Kode Buku (kecuali untuk buku ini sendiri)
        const duplicateResult = await pool.query('SELECT id FROM books WHERE kodeBuku = $1 AND id != $2', [kodeBuku, bookId]);
        if (duplicateResult.rows && duplicateResult.rows.length > 0) {
            // No rollback
            return res.status(400).json({ message: 'Kode Buku sudah digunakan oleh buku lain.' });
        }
        
        // 2. Ambil data lama
        const oldBookResult = await pool.query('SELECT totalstock, availablestock, image_url, attachment_url FROM books WHERE id = $1', [bookId]);
        if (!oldBookResult.rows || oldBookResult.rows.length === 0) {
            // No rollback
            return res.status(404).json({ message: 'Buku tidak ditemukan.' });
        }
        const { totalstock: oldTotalStock, availablestock: oldAvailableStock, image_url: oldImageUrl, attachment_url: oldAttachmentUrl } = oldBookResult.rows[0];
        
        const newTotalStock = parseInt(totalStock);
        const stockDifference = newTotalStock - oldTotalStock;
        const newAvailableStock = oldAvailableStock + stockDifference;

        if (newAvailableStock < 0) {
            // No rollback
            return res.status(400).json({ message: 'Stok tersedia tidak boleh negatif. Pastikan total stok baru minimal sama dengan jumlah buku yang sedang dipinjam.' });
        }
        
        // Tentukan URL yang akan disimpan (gunakan yang baru jika ada, jika tidak gunakan yang lama)
        const finalImageUrl = newImageUrl || oldImageUrl;
        const finalAttachmentUrl = newAttachmentUrl || oldAttachmentUrl;
        
        // 3. Dynamically check which columns exist in the books table
        const columnsResult = await pool.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'public' 
            AND TABLE_NAME = 'books'
        `);
        const existingColumns = columnsResult.rows.map(col => col.column_name);
        
        // Build dynamic update query with PostgreSQL placeholders
        const updates = [
            'title = $1', 'kodeBuku = $2', 'author = $3', 'publisher = $4', 'publicationYear = $5',
            'totalstock = $6', 'availablestock = $7', 'category = $8', 'image_url = $9',
            'description = $10', 'location = $11'
        ];
        const values = [
            title, kodeBuku, author, publisher || null, publicationYear || null,
            newTotalStock, newAvailableStock, category, finalImageUrl,
            description || null, location
        ];
        
        let paramCount = 12;
        // Add optional columns if they exist
        if (existingColumns.includes('programstudi')) {
            updates.push(`programStudi = $${paramCount}`);
            values.push(programStudi || null);
            paramCount++;
        }
        if (existingColumns.includes('bahasa')) {
            updates.push(`bahasa = $${paramCount}`);
            values.push(bahasa || 'Bahasa Indonesia');
            paramCount++;
        }
        if (existingColumns.includes('jeniskoleksi')) {
            updates.push(`jenisKoleksi = $${paramCount}`);
            values.push(jenisKoleksi || 'Buku Asli');
            paramCount++;
        }
        if (existingColumns.includes('lampiran')) {
            updates.push(`lampiran = $${paramCount}`);
            values.push(lampiran || 'Tidak Ada');
            paramCount++;
        }
        if (existingColumns.includes('attachment_url')) {
            updates.push(`attachment_url = $${paramCount}`);
            values.push(finalAttachmentUrl);
            paramCount++;
        }
        if (existingColumns.includes('pemusatanmateri')) {
            updates.push(`pemusatanMateri = $${paramCount}`);
            values.push(pemusatanMateri || null);
            paramCount++;
        }
        if (existingColumns.includes('pages')) {
            updates.push(`pages = $${paramCount}`);
            values.push(pages || null);
            paramCount++;
        }
        
        values.push(bookId); // WHERE id = $paramCount
        
        const updateQuery = `UPDATE books SET ${updates.join(', ')} WHERE id = $${paramCount}`;
        console.log('📊 [UPDATE BOOK] SQL:', updateQuery);
        console.log('📊 [UPDATE BOOK] Values:', values);

        const result = await pool.query(updateQuery, values);

        // No commit
        console.log('✅ [UPDATE BOOK] Success! Book ID:', bookId);
        res.json({ success: true, message: 'Buku berhasil diperbarui.' });

    } catch (error) {
        console.error('❌ [UPDATE BOOK] Error:', error);
        res.status(500).json({ message: 'Gagal memperbarui buku.', error: error.message });
    }
};

// 5. Menghapus Buku (DELETE /api/books/:id)
exports.deleteBook = async (req, res) => {
    const pool = getDBPool(req);
    const bookId = req.params.id;

    try {
        // 1. Cek apakah ada pinjaman aktif (Penting: Logika yang diminta dipertahankan)
        const [activeLoans] = await pool.query('SELECT COUNT(*) as count FROM loans WHERE book_id = $1 AND status IN ($2, $3, $4)', 
            [bookId, 'Sedang Dipinjam', 'Menunggu Persetujuan', 'Siap Dikembalikan']
        );
        if (activeLoans[0].count > 0) {
            return res.status(400).json({ message: `Tidak dapat menghapus buku. Terdapat ${activeLoans[0].count} pinjaman yang masih aktif (Dipinjam/Tertunda/Siap Dikembalikan).` });
        }

        // 2. Ambil image_url sebelum menghapus data
        const [book] = await pool.query('SELECT image_url FROM books WHERE id = $1', [bookId]);
        
        // 3. Hapus data buku
        const result = await pool.query('DELETE FROM books WHERE id = $1', [bookId]);

        if (result.rowCount === 0) {
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
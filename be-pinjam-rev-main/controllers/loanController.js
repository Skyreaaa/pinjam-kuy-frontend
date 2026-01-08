// File: controllers/loanController.js (FULL KODE - FIXED SQL & LOGIKA LENGKAP)

const getDBPool = (req) => req.app.get('dbPool');
const { format, addDays, isBefore, differenceInCalendarDays, startOfDay } = require('date-fns');
const pushController = require('./pushController'); // Import push notifications
// Batas maksimum hari peminjaman dihapus agar sepenuhnya mengikuti input user
// (tetap bisa dipakai di tempat lain jika ingin logika tambahan)
const MAX_LOAN_DAYS = Infinity;
const PENALTY_PER_DAY = 2000; 

// Helper untuk format Rupiah
const formatRupiah = (amount) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
};

// Helper untuk menghitung Denda
const calculatePenalty = (expectedReturnDate, actualReturnDate) => {
    // Hitung denda berbasis selisih hari kalender, bukan jam
    const expected = startOfDay(new Date(expectedReturnDate));
    const actual = startOfDay(new Date(actualReturnDate));
    const daysLate = Math.max(0, differenceInCalendarDays(actual, expected));
    return daysLate * PENALTY_PER_DAY;
};

// =========================================================
//                   RUTE USER (Peminjaman)
// =========================================================

// Helper: Backfill kodePinjam jika masih NULL / kosong pada baris lama
async function backfillMissingKodePinjam(connection) {
    // Pastikan kolom ada
    const [cols] = await connection.query('SHOW COLUMNS FROM loans');
    const names = cols.map(c => c.Field);
    if (!names.includes('kodePinjam')) return; // tidak ada kolom, abaikan

    // Cari baris yang belum punya kodePinjam, tapi hanya untuk status yang sudah disetujui/aktif (bukan pending)
    const [missing] = await connection.query("SELECT id, loanDate FROM loans WHERE (kodePinjam IS NULL OR kodePinjam = '') AND status <> 'Menunggu Persetujuan' LIMIT 250");
    if (missing.length === 0) return; // nothing to do

    for (const row of missing) {
        const baseDate = row.loanDate ? new Date(row.loanDate) : new Date();
        const datePart = format(baseDate, 'yyyyMMdd');
        const rnd = Math.random().toString(36).substring(2,6).toUpperCase();
        const code = `KP-${datePart}-${rnd}`;
        try {
            await connection.query('UPDATE loans SET kodePinjam = ? WHERE id = ? AND (kodePinjam IS NULL OR kodePinjam = ?) LIMIT 1', [code, row.id, '']);
        } catch (e) {
            // Kemungkinan duplikat, coba format alternatif deterministik
            const fallback = `KP-${String(row.id).padStart(6,'0')}`;
            try { await connection.query('UPDATE loans SET kodePinjam = ? WHERE id = ? AND (kodePinjam IS NULL OR kodePinjam = ?) LIMIT 1', [fallback, row.id, '']); } catch {}
        }
    }
            // Approval pinjaman dinonaktifkan, tidak ada pinjaman tertunda
            exports.getPendingLoans = async (req, res) => {
                res.json([]);
            };
}

// 1. Meminta Pinjaman (POST /api/loans/request)
exports.requestLoan = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id; 
    const { bookId, purpose, returnDate } = req.body; // returnDate opsional dari frontend

    if (!bookId) {
        return res.status(400).json({ message: 'ID Buku diperlukan.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cek 1: Batas Maksimal Pinjaman (misal 3 buku) -- perluas status aktif
        const [activeLoans] = await connection.query('SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN (?, ?, ?, ?)', [userId, 'Menunggu Persetujuan', 'Disetujui', 'Diambil', 'Sedang Dipinjam']);
        if (activeLoans[0].count >= 3) {
            await connection.rollback();
            return res.status(400).json({ message: 'Anda telah mencapai batas maksimal 3 pinjaman aktif/tertunda.' });
        }
        
        // Cek 2: Ketersediaan Stok & Info Buku (lampiran/attachment)
        const [book] = await connection.query('SELECT title, availableStock, lampiran, attachment_url FROM books WHERE id = ?', [bookId]);
        if (book.length === 0 || book[0].availableStock <= 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Stok buku tidak tersedia.' });
        }
        
        // Cek apakah buku digital (punya attachment)
        const isDigitalBook = book[0].lampiran && book[0].lampiran !== 'Tidak Ada' && book[0].attachment_url;
        
        // Cek 3: Duplikasi Permintaan
        // - Untuk buku FISIK: user tidak boleh pinjam buku SAMA yang masih aktif
        // - Untuk buku DIGITAL: user bisa pinjam buku digital meski sudah pinjam buku digital/fisik lain
        if (!isDigitalBook) {
            // Untuk buku fisik, cek apakah user sudah pinjam buku SAMA
            const [duplicate] = await connection.query('SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status IN (?, ?, ?, ?)', [userId, bookId, 'Menunggu Persetujuan','Disetujui','Diambil','Sedang Dipinjam']);
            if (duplicate.length > 0) {
                await connection.rollback();
                return res.status(400).json({ message: 'Anda sudah meminjam / mengajukan buku fisik ini. Kembalikan buku terlebih dahulu sebelum meminjam lagi.' });
            }
        }
        // Untuk buku digital, tidak ada blocking sama sekali

        // Tentukan tanggal pinjam & estimasi kembali (gunakan returnDate dari client jika valid <= MAX_LOAN_DAYS)
        const now = new Date();
        const loanDate = format(now, 'yyyy-MM-dd HH:mm:ss');
        let expectedReturnDate = null;
        
        // Untuk buku digital, tidak perlu returnDate
        if (!isDigitalBook && returnDate) {
            // Ikuti penuh tanggal yang dipilih user (tanpa batas maksimum hari)
            const clientReturn = new Date(returnDate);
            // Jika tanggal valid dan di masa depan/hari ini, pakai langsung
            if (!isNaN(clientReturn.getTime())) {
                expectedReturnDate = format(clientReturn, 'yyyy-MM-dd HH:mm:ss');
            }
        }
        if (!expectedReturnDate) {
            // Jika user tidak mengisi atau tanggal tidak valid, fallback 7 hari dari sekarang
            expectedReturnDate = format(addDays(now, 7), 'yyyy-MM-dd HH:mm:ss');
        }

        // Pastikan kolom tambahan ada (runtime safety jika migrasi belum jalan)
        const [cols] = await connection.query("SHOW COLUMNS FROM loans");
        const colNames = cols.map(c => c.Field);
        let hasKode = colNames.includes('kodePinjam');
        let hasPurpose = colNames.includes('purpose');
        if (!hasKode || !hasPurpose) {
            try {
                if (!hasKode) await connection.query("ALTER TABLE loans ADD COLUMN kodePinjam varchar(40) NULL AFTER status");
                if (!hasPurpose) await connection.query("ALTER TABLE loans ADD COLUMN purpose text NULL");
                if (!hasKode) { try { await connection.query('ALTER TABLE loans ADD UNIQUE KEY uniq_kodePinjam (kodePinjam)'); } catch {}
                }
                // Refresh daftar kolom setelah ALTER
                const [cols2] = await connection.query('SHOW COLUMNS FROM loans');
                const fresh = cols2.map(c=>c.Field);
                hasKode = fresh.includes('kodePinjam');
                hasPurpose = fresh.includes('purpose');
            } catch (mErr) {
                console.warn('[LOAN][MIGRATION RUNTIME] Gagal menambah kolom:', mErr.message);
            }
        }

        // Buat kodePinjam langsung saat request
        const genKode = () => {
            const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
            const datePart = format(now, 'yyyyMMdd');
            return `KP-${datePart}-${randomPart}`;
        };
        let kodePinjam = genKode();

        // Susun query insert dinamis sesuai kolom yang ada (gunakan flag hasKode/hasPurpose yang sudah direfresh)
        const baseCols = ['user_id','book_id','loanDate','expectedReturnDate','status'];
        const vals = [userId, bookId, loanDate, expectedReturnDate, 'Disetujui'];
        if (hasKode) { baseCols.push('kodePinjam'); vals.push(kodePinjam); }
        if (hasPurpose) { baseCols.push('purpose'); vals.push(purpose || null); }
        const placeholders = baseCols.map(()=>'?').join(',');
        const insertSQL = `INSERT INTO loans (${baseCols.join(',')}) VALUES (${placeholders})`;
        const [result] = await connection.query(insertSQL, vals);

        // Kurangi Stok Tersedia
        await connection.query('UPDATE books SET availableStock = availableStock - 1 WHERE id = ?', [bookId]);

        await connection.commit();
        const loanPayload = {
            id: result.insertId,
            bookTitle: book[0].title,
            loanDate,
            expectedReturnDate,
            status: 'Disetujui',
            kodePinjam,
        };
        if (purpose) loanPayload.purpose = purpose;

        // --- TRIGGER SOCKET.IO NOTIFIKASI ADMIN: Permintaan pinjam baru ---
        try {
            const io = req.app.get('io');
            if (io) {
                io.to('admins').emit('notification', {
                    message: `Permintaan pinjam baru: Buku "${book[0].title}" oleh user ID ${userId}.`,
                    type: 'info',
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif requestLoan ke admin:', err.message);
        }
        
        // Kirim push notification ke semua admin
        try {
            await pushController.sendPushToAdmins({
                title: 'Pemberitahuan',
                message: `Permintaan pinjam baru: Buku "${book[0].title}" oleh user ID ${userId}`,
                tag: 'new-loan-request',
                data: { loanId: loanPayload.id, type: 'new_loan' },
                requireInteraction: true
            });
        } catch (err) {
            console.warn('[PUSH][NOTIF] Gagal kirim push notif requestLoan ke admin:', err.message);
        }
        
        res.json({ 
            success: true, 
            message: `Permintaan pinjaman buku "${book[0].title}" berhasil. Kode pinjam sudah aktif, Anda dapat langsung mengambil buku.`,
            loan: loanPayload
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error requesting loan:', error);
        res.status(500).json({ message: 'Gagal memproses permintaan pinjaman.' });
    } finally {
        if (connection) connection.release();
    }
};

// 2. Mendapatkan Riwayat Pinjaman User (GET /api/loans/user-history)
exports.getUserLoanHistory = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id; 

    try {
        const query = `
            SELECT 
                l.id, l.loanDate, l.expectedReturnDate, l.actualReturnDate, l.status, l.fineAmount, l.finePaid, l.returnProofUrl, l.kodePinjam,
                b.title, b.author, b.kodeBuku, b.image_url, b.location, b.lampiran, b.attachment_url
            FROM loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.user_id = ?
            ORDER BY l.loanDate DESC
        `;
        const [loans] = await pool.query(query, [userId]);
        
        // Cek dan update status pinjaman jika terlambat (auto-update status "Sedang Dipinjam" ke "Terlambat")
        const today = new Date();
        const updatedLoans = loans.map(loan => {
            if (loan.status === 'Sedang Dipinjam' && loan.expectedReturnDate && isBefore(new Date(loan.expectedReturnDate), today)) {
                // Tandai sebagai terlambat di response, tidak perlu update DB setiap saat
                return { ...loan, status: 'Terlambat' };
            }
            return loan;
        });

        res.json(updatedLoans);
    } catch (error) {
        console.error('❌ Error fetching user loan history:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat pinjaman.' });
    }
};

// 2b. Mendapatkan Semua Pinjaman User (GET /api/loans/user) - untuk tampilan tab (pending/active/history)
exports.getUserLoans = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const connection = await pool.getConnection();
        const [cols] = await connection.query('SHOW COLUMNS FROM loans');
        const names = cols.map(c => c.Field);
        const selectParts = [
            'l.id','l.loanDate','l.expectedReturnDate AS returnDate','l.actualReturnDate','l.status','l.fineAmount','l.returnDecision'
        ];
        if (names.includes('kodePinjam')) selectParts.push('l.kodePinjam');
        if (names.includes('purpose')) selectParts.push('l.purpose');
        if (names.includes('finePaid')) selectParts.push('l.finePaid');
        if (names.includes('finePaymentStatus')) selectParts.push('l.finePaymentStatus');
        if (names.includes('finePaymentMethod')) selectParts.push('l.finePaymentMethod');
        if (names.includes('finePaymentProof')) selectParts.push('l.finePaymentProof');
        selectParts.push('b.title as bookTitle','b.kodeBuku','b.author','b.location','b.lampiran','b.attachment_url');
        
        // Backfill sebelum select (non-blok karena sederhana)
        try { await backfillMissingKodePinjam(connection); } catch (bfErr) { console.warn('[LOAN][BACKFILL] gagal:', bfErr.message); }
        
        const query = `SELECT ${selectParts.join(', ')} FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ? ORDER BY l.loanDate DESC`;
        const [rows] = await connection.query(query, [userId]);
        
        // Auto-cancel expired QR codes
        const now = new Date();
        for (const loan of rows) {
            if (loan.status === 'Disetujui' && loan.loanDate) {
                const loanTime = new Date(loan.loanDate).getTime();
                const expiry = loanTime + 24 * 60 * 60 * 1000;
                if (now.getTime() > expiry) {
                    // QR expired, auto-cancel
                    await connection.query(
                        'UPDATE loans SET status = ? WHERE id = ?',
                        ['Ditolak', loan.id]
                    );
                    // Kembalikan stok
                    await connection.query(
                        'UPDATE books SET availableStock = availableStock + 1 WHERE id = (SELECT book_id FROM loans WHERE id = ?)',
                        [loan.id]
                    );
                    console.log(`[AUTO-CANCEL] Loan ID ${loan.id} expired and auto-canceled`);
                    loan.status = 'Ditolak'; // Update di response juga
                }
            }
        }
        
        connection.release();
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching user loans:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar pinjaman.' });
    }
};

// 2c. Batalkan Peminjaman (POST /api/loans/:id/cancel)
exports.cancelLoan = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const loanId = req.params.id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cek kepemilikan dan status
        const [loans] = await connection.query(
            'SELECT status, book_id FROM loans WHERE id = ? AND user_id = ?',
            [loanId, userId]
        );

        if (loans.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan atau bukan milik Anda.' });
        }

        const loan = loans[0];
        
        // Hanya bisa cancel jika status Menunggu Persetujuan atau Disetujui
        if (loan.status !== 'Menunggu Persetujuan' && loan.status !== 'Disetujui') {
            await connection.rollback();
            return res.status(400).json({ message: 'Peminjaman tidak dapat dibatalkan pada status ini.' });
        }

        // Update status menjadi Dibatalkan User (cancelled by user)
        await connection.query(
            'UPDATE loans SET status = ? WHERE id = ?',
            ['Dibatalkan User', loanId]
        );

        // Kembalikan stok buku
        await connection.query(
            'UPDATE books SET availableStock = availableStock + 1 WHERE id = ?',
            [loan.book_id]
        );

        await connection.commit();
        res.json({ success: true, message: 'Peminjaman berhasil dibatalkan.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error canceling loan:', error);
        res.status(500).json({ message: 'Gagal membatalkan peminjaman.' });
    } finally {
        if (connection) connection.release();
    }
};

// 3. Menandai Siap Dikembalikan (POST /api/loans/ready-to-return/:id)
exports.markAsReadyToReturn = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id; 
    const loanId = req.params.id;

    if (!loanId) {
        return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });
    }

    try {
        // Cek kepemilikan dan status pinjaman + kolom opsional
        const [loans] = await pool.query(
            "SELECT status, returnProofUrl FROM loans WHERE id = ? AND user_id = ?",
            [loanId, userId]
        );

        if (loans.length === 0) {
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan atau bukan milik Anda.' });
        }

        const currentStatus = loans[0].status;

        // Izinkan dari 'Diambil', 'Sedang Dipinjam' atau 'Terlambat'
        if (!['Diambil', 'Sedang Dipinjam', 'Terlambat'].includes(currentStatus)) {
            return res.status(400).json({ message: `Pinjaman berstatus '${currentStatus}'. Hanya 'Diambil', 'Sedang Dipinjam' atau 'Terlambat' yang bisa ditandai siap dikembalikan.` });
        }

        // Tangani URL bukti (dari upload file ke Cloudinary via multer)
        let proofUrl = loans[0].returnProofUrl || null;
        
        if (req.file) {
            // File berhasil di-upload ke Cloudinary via multer
            proofUrl = req.file.path; // Cloudinary URL
        }

        // Parse metadata dari body
        let metadata = null;
        if (req.body.latitude && req.body.longitude) {
            metadata = {
                lat: parseFloat(req.body.latitude),
                lng: parseFloat(req.body.longitude),
                accuracy: parseFloat(req.body.accuracy || 0),
                time: req.body.captureTime || new Date().toISOString()
            };
        } else if (req.body.metadata) {
            try {
                metadata = JSON.parse(req.body.metadata);
            } catch (e) {
                console.warn('Failed to parse metadata:', e);
            }
        }

        // Update status menjadi Siap Dikembalikan + set readyReturnDate + proof + metadata
        const [result] = await pool.query(
            "UPDATE loans SET status = ?, readyReturnDate = ?, returnProofUrl = ?, returnProofMetadata = ? WHERE id = ? AND user_id = ?",
            ['Siap Dikembalikan', new Date(), proofUrl, metadata ? JSON.stringify(metadata) : null, loanId, userId]
        );

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Buku ditandai Siap Dikembalikan. Menunggu verifikasi Admin.', proofUrl });
        } else {
            res.status(500).json({ message: 'Gagal memperbarui status pinjaman.' });
        }

    } catch (error) {
        console.error('❌ Error marking as ready to return:', error);
        res.status(500).json({ message: 'Gagal memproses permintaan pengembalian.' });
    }
};


// =========================================================
//                   RUTE ADMIN (Kelola Pinjaman & Pengembalian)
// =========================================================

// 4. Mendapatkan Pinjaman Tertunda (GET /api/admin/loans/pending)
exports.getPendingLoans = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const query = `
            SELECT 
                l.id, l.loanDate, l.status,
                b.title, b.kodeBuku, b.author, 
                u.username, u.npm, u.fakultas, u.prodi
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status = 'Menunggu Persetujuan'
            ORDER BY l.loanDate ASC
        `;
        const [loans] = await pool.query(query);
        res.json(loans);
    } catch (error) {
        console.error('❌ Error fetching pending loans:', error);
        res.status(500).json({ message: 'Gagal mengambil data pinjaman tertunda.' });
    }
};

// 5. Mendapatkan Pengembalian untuk Review (GET /api/admin/returns/review)
exports.getReturnsForReview = async (req, res) => {
    console.log('🔍 [getReturnsForReview] Function called');
    const pool = getDBPool(req);
    try {
        // Check if returnProofMetadata column exists
        let hasMetadataCol = false;
        try {
            const [cols] = await pool.query("SHOW COLUMNS FROM loans LIKE 'returnProofMetadata'");
            hasMetadataCol = cols.length > 0;
            console.log('📊 [getReturnsForReview] Has metadata column:', hasMetadataCol);
        } catch (e) {
            console.warn('Failed to check returnProofMetadata column:', e.message);
        }

        const metadataField = hasMetadataCol ? ', l.returnProofMetadata' : '';
        
        const query = `
            SELECT 
                l.id as loanId,
                l.user_id as userId,
                l.book_id as bookId,
                l.kodePinjam,
                l.loanDate, 
                l.expectedReturnDate as returnDate, 
                l.status, 
                l.returnProofUrl as proofUrl${metadataField},
                b.title as bookTitle,
                u.username as userName,
                u.npm as userNpm
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status = 'Siap Dikembalikan'
            ORDER BY l.readyReturnDate DESC
        `;
        
        console.log('📝 [getReturnsForReview] Executing query...');
        const [loans] = await pool.query(query);
        console.log('✅ [getReturnsForReview] Query result:', loans.length, 'loans found');
        
        // Parse metadata JSON dengan error handling
        const returns = loans.map(loan => {
            let parsedMetadata = null;
            if (loan.returnProofMetadata) {
                try {
                    parsedMetadata = typeof loan.returnProofMetadata === 'string' 
                        ? JSON.parse(loan.returnProofMetadata) 
                        : loan.returnProofMetadata;
                } catch (e) {
                    console.warn('Failed to parse metadata for loan', loan.loanId, e.message);
                }
            }
            
            return {
                loanId: loan.loanId,
                userId: loan.userId,
                bookId: loan.bookId,
                kodePinjam: loan.kodePinjam,
                loanDate: loan.loanDate,
                returnDate: loan.returnDate,
                status: loan.status,
                proofUrl: loan.proofUrl,
                bookTitle: loan.bookTitle,
                userName: loan.userName,
                userNpm: loan.userNpm,
                returnProofMetadata: parsedMetadata
            };
        });

        console.log('📤 [getReturnsForReview] Sending response with', returns.length, 'returns');
        res.json({ success: true, returns });
    } catch (error) {
        console.error('❌ Error fetching returns for review:', error);
        res.status(500).json({ message: 'Gagal mengambil data pengembalian.', error: error.message });
    }
};

// 6. Menyetujui Pinjaman (POST /api/admin/loans/approve)
// Baru: set status 'Disetujui', generate kodePinjam (jika belum ada), set approvedAt, dan trigger notifikasi user
exports.approveLoan = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId } = req.body;
    if (!loanId) return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });
    try {
        const now = new Date();
        // Ambil expectedReturnDate, kodePinjam, user_id, book_id
        const [rows] = await pool.query('SELECT expectedReturnDate, kodePinjam, user_id, book_id FROM loans WHERE id = ?', [loanId]);
        if (!rows.length) return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        const currentExpected = rows[0].expectedReturnDate;
        const expected = currentExpected || addDays(now, 7);
        let kode = rows[0].kodePinjam;
        if (!kode || kode === '') {
            const datePart = format(now, 'yyyyMMdd');
            const rnd = Math.random().toString(36).substring(2,6).toUpperCase();
            kode = `KP-${datePart}-${rnd}`;
            try { await pool.query('UPDATE loans SET kodePinjam=? WHERE id=?',[kode, loanId]); } catch {}
        }
        // Set status Disetujui, set approvedAt, jangan set loanDate di tahap ini
        const [result] = await pool.query(
            "UPDATE loans SET status = 'Disetujui', expectedReturnDate = ?, approvedAt = ?, userNotified = 0 WHERE id = ? AND status = 'Menunggu Persetujuan'",
            [expected, now, loanId]
        );
        if (result.affectedRows === 0) {
            const [exist] = await pool.query('SELECT status FROM loans WHERE id = ?',[loanId]);
            if (exist.length) return res.status(400).json({ message: `Pinjaman sudah diproses (Status: ${exist[0].status}).` });
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        }
        // --- TRIGGER SOCKET.IO NOTIF KE USER ---
        try {
            const io = req.app.get('io');
            const userId = rows[0].user_id;
            // Ambil judul buku
            let bookTitle = '';
            try {
                const [bookRows] = await pool.query('SELECT title FROM books WHERE id = ?', [rows[0].book_id]);
                if (bookRows.length) bookTitle = bookRows[0].title;
            } catch {}
            if (io && userId) {
                io.to(`user_${userId}`).emit('notification', {
                    message: `Pinjaman buku${bookTitle ? ' "' + bookTitle + '"' : ''} disetujui. QR siap digunakan.`,
                    type: 'success',
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif approveLoan:', err.message);
        }
        res.json({ success:true, message:'Pinjaman disetujui. QR siap ditunjukkan oleh pengguna.', expectedReturnDate: expected, kodePinjam: kode });
    } catch (e){
        console.error('❌ Error approving loan:', e);
        res.status(500).json({ message:'Gagal menyetujui pinjaman.' });
    }
};

// 6b. Scan kodePinjam oleh Admin (POST /api/admin/loans/scan {kodePinjam})
// TRANSISI: Disetujui -> Diambil (set loanDate = now)
exports.scanLoan = async (req, res) => {
    const pool = getDBPool(req);
    const { kodePinjam } = req.body;
    if (!kodePinjam) return res.status(400).json({ message:'kodePinjam diperlukan.' });
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.status, l.loanDate, l.book_id as bookId, l.user_id as userId,
                   b.title as bookTitle,
                   u.username as borrowerName
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.kodePinjam = ? LIMIT 1
        `, [kodePinjam]);
        if (!rows.length) return res.status(404).json({ message:'Kode tidak ditemukan.' });
        const loan = rows[0];
        
        // Jika status bukan 'Disetujui', kembalikan error dengan detail
        if (loan.status !== 'Disetujui') {
            return res.status(400).json({ 
                message: `Status sekarang '${loan.status}'. Hanya 'Disetujui' yang bisa discan untuk pengambilan.`,
                bookTitle: loan.bookTitle || 'Tidak Diketahui',
                borrowerName: loan.borrowerName || 'Tidak Diketahui',
                currentStatus: loan.status
            });
        }
        
        // Check QR expiry: loanDate + 24h
        if (!loan.loanDate) return res.status(400).json({ 
            message:'QR tidak valid (loanDate kosong).',
            bookTitle: loan.bookTitle || 'Tidak Diketahui',
            borrowerName: loan.borrowerName || 'Tidak Diketahui'
        });
        const loanTime = new Date(loan.loanDate).getTime();
        const nowTime = Date.now();
        if (nowTime > loanTime + 24 * 60 * 60 * 1000) {
            return res.status(400).json({ 
                message:'QR Expired. Kode pinjam sudah melewati masa berlaku 24 jam.',
                bookTitle: loan.bookTitle || 'Tidak Diketahui',
                borrowerName: loan.borrowerName || 'Tidak Diketahui',
                loanDate: loan.loanDate
            });
        }
        const now = new Date();
        await pool.query("UPDATE loans SET status = 'Diambil', loanDate = ? WHERE id = ?", [now, loan.id]);
        
        // Kirim notifikasi real-time ke user via Socket.IO
        try {
            const io = req.app.get('io');
            if (io && loan.userId) {
                io.to(`user_${loan.userId}`).emit('notification', {
                    message: `Buku "${loan.bookTitle}" telah diambil dan siap dipinjam. Selamat membaca!`,
                    type: 'success',
                    loanId: loan.id,
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif scan ke user:', err.message);
        }
        
        // Kirim push notification ke user
        try {
            await pushController.sendPushNotification(loan.userId, 'user', {
                title: 'Pemberitahuan',
                message: `Buku "${loan.bookTitle}" telah diambil dan siap dipinjam. Selamat membaca!`,
                tag: 'loan-pickup',
                data: { loanId: loan.id, type: 'pickup' },
                requireInteraction: false
            });
        } catch (err) {
            console.warn('[PUSH][NOTIF] Gagal kirim push notif scan ke user:', err.message);
        }
        
        res.json({ 
            success: true, 
            message: 'Scan berhasil. Buku ditandai Diambil.', 
            loanId: loan.id,
            bookTitle: loan.bookTitle || 'Tidak Diketahui',
            borrowerName: loan.borrowerName || 'Tidak Diketahui',
            loanDate: now.toISOString()
        });
    } catch (e){
        console.error('❌ Error scan loan:', e); res.status(500).json({ message:'Gagal memproses scan.' });
    }
};

// 6c. Mulai masa pinjam (POST /api/admin/loans/start {loanId})
// TRANSISI: Diambil -> Sedang Dipinjam
// Aturan baru: Tanggal jatuh tempo (expectedReturnDate) digeser relatif dari saat mulai (scan),
//              mempertahankan durasi rencana awal user. Dengan demikian denda baru dihitung
//              setelah admin melakukan scan & start.
exports.startLoan = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId } = req.body;
    if (!loanId) return res.status(400).json({ message:'loanId diperlukan.' });
    try {
        const [rows] = await pool.query('SELECT status, loanDate, expectedReturnDate FROM loans WHERE id = ? LIMIT 1',[loanId]);
        if (!rows.length) return res.status(404).json({ message:'Pinjaman tidak ditemukan.' });
        const loan = rows[0];
        if (loan.status !== 'Diambil') return res.status(400).json({ message:`Status sekarang '${loan.status}'. Harus 'Diambil' untuk mulai dipinjam.` });
        // Hitung durasi rencana awal (hari) dari request: expectedReturnDate - loanDate (saat request)
        const baseLoanDate = loan.loanDate ? new Date(loan.loanDate) : new Date();
        const baseExpected = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : addDays(baseLoanDate, 7);
        let plannedDays = Math.max(1, differenceInCalendarDays(startOfDay(baseExpected), startOfDay(baseLoanDate)));
        // Set expectedReturnDate baru berdasarkan waktu mulai sekarang
        const now = new Date();
        const newExpected = addDays(now, plannedDays);
        await pool.query("UPDATE loans SET status='Sedang Dipinjam', expectedReturnDate = ? WHERE id = ?", [newExpected, loanId]);
        res.json({ success:true, message:'Peminjaman dimulai.', expectedReturnDate: newExpected });
    } catch (e){
        console.error('❌ Error start loan:', e); res.status(500).json({ message:'Gagal memulai pinjaman.' });
    }
};

// 7. Menolak Pinjaman (POST /api/admin/loans/reject)
exports.rejectLoan = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId } = req.body;

    if (!loanId) {
        return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Ambil info buku & user sebelum update status
        const [loanInfo] = await connection.query(`
            SELECT l.book_id, b.title 
            FROM loans l JOIN books b ON l.book_id = b.id 
            WHERE l.id = ? AND l.status = 'Menunggu Persetujuan'`, [loanId]);

        if (loanInfo.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pinjaman tertunda tidak ditemukan atau sudah diproses.' });
        }

        // 1. Update status pinjaman
        const [result] = await connection.query(
            "UPDATE loans SET status = ?, rejectionDate = ?, rejectionNotified = 0 WHERE id = ? AND status = 'Menunggu Persetujuan'",
            ['Ditolak', new Date(), loanId]
        );
        
        // 2. Tambah kembali stok buku
        await connection.query('UPDATE books SET availableStock = availableStock + 1 WHERE id = ?', [loanInfo[0].book_id]);

        await connection.commit();
        res.json({ success: true, message: `Permintaan pinjaman buku "${loanInfo[0].title}" berhasil ditolak.` });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error rejecting loan:', error);
        res.status(500).json({ message: 'Gagal menolak pinjaman.' });
    } finally {
        if (connection) connection.release();
    }
};


// 8. Memproses Pengembalian (POST /api/admin/returns/process)
exports.processReturn = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId, manualFineAmount = 0, fineReason = '' } = req.body; // Admin bisa input denda manual + alasan

    if (!loanId) {
        return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const actualReturnDate = new Date();

        // 1. Ambil data pinjaman untuk perhitungan denda otomatis
        const [loanData] = await connection.query(
            "SELECT l.expectedReturnDate, l.book_id, l.user_id, u.denda, b.title FROM loans l JOIN users u ON l.user_id = u.id JOIN books b ON l.book_id = b.id WHERE l.id = ? AND l.status IN (?, ?, ?)",
            [loanId, 'Sedang Dipinjam', 'Terlambat', 'Siap Dikembalikan']
        );

        if (loanData.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan atau sudah dikembalikan.' });
        }

        const { expectedReturnDate, book_id, user_id, denda: userCurrentFine, title: bookTitle } = loanData[0];
        
        // Hitung denda keterlambatan (Otomatis)
        const autoPenalty = calculatePenalty(expectedReturnDate, actualReturnDate);
        
        // Total Denda = Denda Otomatis + Denda Manual
        const totalFine = autoPenalty + Number(manualFineAmount); 

        // 2. Update status pinjaman menjadi 'Dikembalikan', simpan denda & tanggal pengembalian
        await connection.query(
            "UPDATE loans SET status = ?, actualReturnDate = ?, fineAmount = ?, finePaid = ?, returnNotified = 0, returnDecision = 'approved', fineReason = ? WHERE id = ?",
            ['Dikembalikan', actualReturnDate, totalFine, 0, fineReason, loanId] // finePaid 0 karena belum dibayar
        );
        
        // 3. Tambahkan total denda ke akun user
        let totalNewFine = 0;
       if (totalFine > 0) {
           await connection.query('UPDATE users SET denda = denda + ?, denda_unpaid = denda_unpaid + ? WHERE id = ?', [totalFine, totalFine, user_id]);
           totalNewFine = totalFine;
       }

        // 4. Tambah stok buku kembali
        await connection.query('UPDATE books SET availableStock = availableStock + 1 WHERE id = ?', [book_id]);

        await connection.commit();
        
        // Berikan detail denda ke admin
        let penaltyMessage = totalNewFine > 0 ? 
            `. Total Denda (Keterlambatan + Manual): **${formatRupiah(totalNewFine)}**. Denda ditambahkan ke akun user.` :
            '. Tidak ada denda yang diterapkan.';

        // --- TRIGGER SOCKET.IO NOTIFIKASI USER: Pengembalian disetujui ---
        try {
            const io = req.app.get('io');
            if (io && user_id) {
                let notifMsg = `Pengembalian buku "${bookTitle}" disetujui admin.`;
                if (totalNewFine > 0) {
                    notifMsg += ` Baca lengkapnya di halaman notifikasi.`;
                }
                io.to(`user_${user_id}`).emit('notification', {
                    message: notifMsg,
                    type: totalNewFine > 0 ? 'warning' : 'success',
                });
                
                // Simpan ke user_notifications table
                const UserNotification = require('../models/user_notifications');
                let detailMsg = `Pengembalian buku "${bookTitle}" telah disetujui oleh admin.`;
                if (totalNewFine > 0) {
                    detailMsg += `\n\n⚠️ Denda: Rp ${totalNewFine.toLocaleString('id-ID')}`;
                    if (autoPenalty > 0) detailMsg += `\n- Keterlambatan: Rp ${autoPenalty.toLocaleString('id-ID')}`;
                    if (manualFineAmount > 0) detailMsg += `\n- Denda Admin: Rp ${Number(manualFineAmount).toLocaleString('id-ID')}`;
                    if (fineReason) detailMsg += `\n\nAlasan denda: ${fineReason}`;
                    detailMsg += `\n\nSilakan bayar denda melalui menu Pembayaran.`;
                } else {
                    detailMsg += `\n\n✅ Tidak ada denda. Terima kasih telah mengembalikan tepat waktu!`;
                }
                
                await UserNotification.create({
                    user_id,
                    type: totalNewFine > 0 ? 'warning' : 'success',
                    message: detailMsg
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif return approved:', err.message);
        }
        res.json({ 
            success: true, 
            message: `Buku "${bookTitle}" berhasil diproses pengembaliannya` + penaltyMessage,
            totalFine: totalNewFine,
            autoPenalty: autoPenalty,
            manualFine: Number(manualFineAmount)
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error processing return:', error);
        res.status(500).json({ message: 'Gagal memproses pengembalian buku.' });
    } finally {
        if (connection) connection.release();
    }
};

// 8b. Menolak Bukti Pengembalian (POST /api/admin/returns/reject)
// Efek: Jika status loan 'Siap Dikembalikan', kembalikan ke status berjalan ('Sedang Dipinjam' atau 'Terlambat' tergantung due date), kosongkan returnProofUrl & readyReturnDate
exports.rejectReturnProof = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId, reason = '', fineAmount = 0 } = req.body; // Admin bisa kasih alasan + denda
    if (!loanId) return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `SELECT id, expectedReturnDate, status FROM loans WHERE id=? FOR UPDATE`,
            [loanId]
        );
        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        }
        const loan = rows[0];
        if (loan.status !== 'Siap Dikembalikan') {
            await connection.rollback();
            return res.status(400).json({ message: `Status sekarang '${loan.status}'. Hanya 'Siap Dikembalikan' yang bisa ditolak bukti pengembaliannya.` });
        }

        // Tentukan status berjalan setelah ditolak
        const now = new Date();
        const due = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : null;
        const nextStatus = (due && now > due) ? 'Terlambat' : 'Sedang Dipinjam';

        await connection.query(
            `UPDATE loans SET status=?, returnProofUrl=NULL, readyReturnDate=NULL, returnNotified = 0, returnDecision = 'rejected', rejectionReason=?, rejectionDate=NOW() WHERE id=?`,
            [nextStatus, reason, loanId]
        );

        // Tambah denda jika admin kasih denda
        let user_id = loan.user_id;
        if (fineAmount > 0) {
            await connection.query(
                `UPDATE loans SET fineAmount = fineAmount + ? WHERE id=?`,
                [fineAmount, loanId]
            );
            await connection.query(
                `UPDATE users SET denda = denda + ?, denda_unpaid = denda_unpaid + ? WHERE id = ?`,
                [fineAmount, fineAmount, user_id]
            );
        }

        await connection.commit();

        // --- TRIGGER SOCKET.IO NOTIFIKASI USER: Bukti pengembalian ditolak ---
        try {
            // Ambil user_id dan judul buku
            const [loanRows] = await connection.query(
                `SELECT l.user_id, b.title FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?`,
                [loanId]
            );
            if (loanRows.length) {
                const { user_id, title } = loanRows[0];
                const io = req.app.get('io');
                if (io && user_id) {
                    let notifMsg = `Pengembalian buku "${title}" ditolak admin. Cek lengkapnya di halaman notifikasi.`;
                    io.to(`user_${user_id}`).emit('notification', {
                        message: notifMsg,
                        type: 'error',
                    });
                }
                
                // Simpan ke user_notifications table
                const UserNotification = require('../models/user_notifications');
                let detailMsg = `Pengembalian buku "${title}" ditolak oleh admin.`;
                if (reason) detailMsg += `\n\nAlasan: ${reason}`;
                if (fineAmount > 0) detailMsg += `\n\nDenda: Rp ${fineAmount.toLocaleString('id-ID')}`;
                detailMsg += `\n\nSilakan upload ulang bukti pengembalian yang valid.`;
                
                await UserNotification.create({
                    user_id,
                    type: 'error',
                    message: detailMsg
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif return rejected:', err.message);
        }

        res.json({ success:true, message:'Bukti pengembalian ditolak. Minta pengguna upload ulang.', nextStatus });
    } catch (e){
        if (connection) await connection.rollback();
        console.error('❌ Error rejectReturnProof:', e);
        res.status(500).json({ message: 'Gagal menolak bukti pengembalian.' });
    } finally {
        if (connection) connection.release();
    }
};

// 9. Notifikasi Approval Peminjaman (GET /api/loans/notifications)
exports.getApprovalNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT id, book_id, approvedAt, status, kodePinjam FROM loans 
             WHERE user_id = ? AND approvedAt IS NOT NULL AND userNotified = 0 AND status IN ('Sedang Dipinjam','Diambil','Disetujui')
             ORDER BY approvedAt DESC LIMIT 20`,
            [userId]
        );
        res.json({ success:true, notifications: rows });
    } catch (e){
        console.error('❌ Error getApprovalNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal mengambil notifikasi.' });
    }
};

// 10. Acknowledge Notifikasi Peminjaman (POST /api/loans/notifications/ack)
exports.ackApprovalNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success:false, message:'IDs diperlukan.' });
    }
    try {
        const placeholders = ids.map(()=>'?').join(',');
        await pool.query(`UPDATE loans SET userNotified = 1 WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...ids]);
        res.json({ success:true });
    } catch (e){
        console.error('❌ Error ackApprovalNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal update notifikasi.' });
    }
};

// 11. Notifikasi Pengembalian (GET /api/loans/return-notifications)
exports.getReturnNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT l.id, l.status, l.returnDecision, l.actualReturnDate, l.fineAmount, b.title AS bookTitle
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = ? AND l.returnNotified = 0 AND l.returnDecision IS NOT NULL
             ORDER BY l.actualReturnDate DESC LIMIT 20`,
            [userId]
        );
        res.json({ success:true, notifications: rows });
    } catch (e){
        console.error('❌ Error getReturnNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal mengambil notifikasi pengembalian.' });
    }
};

// 12. Acknowledge Notifikasi Pengembalian (POST /api/loans/return-notifications/ack)
exports.ackReturnNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success:false, message:'IDs diperlukan.' });
    }
    try {
        const placeholders = ids.map(()=>'?').join(',');
        await pool.query(`UPDATE loans SET returnNotified = 1 WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...ids]);
        res.json({ success:true });
    } catch (e){
        console.error('❌ Error ackReturnNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal update notifikasi pengembalian.' });
    }
};

// 13. Riwayat Notifikasi (GET /api/loans/notifications/history)
exports.getNotificationHistory = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        // Check if returnProofMetadata column exists
        let hasMetadataCol = false;
        try {
            const [cols] = await pool.query("SHOW COLUMNS FROM loans LIKE 'returnProofMetadata'");
            hasMetadataCol = cols.length > 0;
        } catch (e) {
            console.warn('Failed to check returnProofMetadata column:', e.message);
        }

        const metadataField = hasMetadataCol ? ', l.returnProofMetadata' : '';

        const [rows] = await pool.query(
                        `SELECT 
                l.id,
                b.title AS bookTitle,
                l.status,
                l.approvedAt,
                l.actualReturnDate,
                                l.returnDecision,
                                l.rejectionDate,
                                l.returnProofUrl${metadataField}
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = ?
               AND (
                    (l.approvedAt IS NOT NULL) OR
                                        (l.returnDecision IS NOT NULL) OR
                                        (l.rejectionDate IS NOT NULL)
               )
                         ORDER BY COALESCE(l.actualReturnDate, l.approvedAt, l.rejectionDate, l.createdAt) DESC
             LIMIT 100`,
            [userId]
        );
        res.json({ success:true, items: rows });
    } catch (e){
        console.error('❌ Error getNotificationHistory:', e);
        res.status(500).json({ success:false, message:'Gagal mengambil riwayat notifikasi.' });
    }
};

// 14. Notifikasi Penolakan Pinjaman (GET /api/loans/rejection-notifications)
exports.getRejectionNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const [rows] = await pool.query(
            `SELECT l.id, l.status, l.rejectionDate, b.title AS bookTitle
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = ? AND l.status = 'Ditolak' AND l.rejectionDate IS NOT NULL AND (l.rejectionNotified = 0 OR l.rejectionNotified IS NULL)
             ORDER BY l.rejectionDate DESC LIMIT 20`,
            [userId]
        );
        res.json({ success:true, notifications: rows });
    } catch (e){
        console.error('❌ Error ackRejectionNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal update notifikasi penolakan.' });
    }
};

// 16. Mendapatkan Riwayat Pengembalian & Persetujuan (GET /api/admin/history)
exports.getHistory = async (req, res) => {
    const pool = getDBPool(req);
    try {
        // Check all optional columns safely
        let hasMetadataCol = false, hasReturnProofUrl = false, hasFineAmount = false, hasFinePaid = false, hasReadyReturnDate = false, hasApprovedAt = false, hasReturnDecision = false, hasRejectionReason = false, hasCreatedAt = false;
        try {
            const [cols] = await pool.query("SHOW COLUMNS FROM loans");
            const colNames = cols.map(c => c.Field);
            hasMetadataCol = colNames.includes('returnProofMetadata');
            hasReturnProofUrl = colNames.includes('returnProofUrl');
            hasFineAmount = colNames.includes('fineAmount');
            hasFinePaid = colNames.includes('finePaid');
            hasReadyReturnDate = colNames.includes('readyReturnDate');
            hasApprovedAt = colNames.includes('approvedAt');
            hasReturnDecision = colNames.includes('returnDecision');
            hasRejectionReason = colNames.includes('rejectionReason');
            hasCreatedAt = colNames.includes('createdAt');
        } catch (e) {
            console.warn('Failed to check columns:', e.message);
        }

        // Build select fields dynamically
        const selectFields = [
            'l.id',
            'l.loanDate',
            'l.expectedReturnDate',
            hasReturnProofUrl ? 'l.returnProofUrl' : "'' AS returnProofUrl",
            'l.status',
            hasFineAmount ? 'l.fineAmount' : '0 AS fineAmount',
            hasFinePaid ? 'l.finePaid' : '0 AS finePaid',
            hasReadyReturnDate ? 'l.readyReturnDate' : "'' AS readyReturnDate",
            hasApprovedAt ? 'l.approvedAt' : "'' AS approvedAt",
            hasReturnDecision ? 'l.returnDecision' : "'' AS returnDecision",
            hasRejectionReason ? 'l.rejectionReason' : "'' AS rejectionReason",
            hasCreatedAt ? 'l.createdAt' : "'' AS createdAt",
            hasMetadataCol ? 'l.returnProofMetadata' : "'' AS returnProofMetadata",
            'b.title', 'b.kodeBuku', 'b.author',
            'u.username', 'u.npm', 'u.fakultas'
        ];

        const query = `
            SELECT ${selectFields.join(', ')}
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status IN ('Dikembalikan', 'Ditolak')
            ORDER BY 
                CASE 
                    WHEN l.actualReturnDate IS NOT NULL THEN l.actualReturnDate
                    WHEN l.approvedAt IS NOT NULL THEN l.approvedAt
                    ELSE l.createdAt
                END DESC
            LIMIT 500
        `;
        let rows = [];
        try {
            [rows] = await pool.query(query);
        } catch (sqlErr) {
            console.error('❌ SQL Error in getHistory:', sqlErr);
            return res.status(500).json({ message: 'Gagal mengambil riwayat: ' + sqlErr.message });
        }

        const formattedRows = rows.map(row => ({
            ...row,
            fineAmountRupiah: formatRupiah(row.fineAmount || 0),
            finePaidRupiah: formatRupiah(row.finePaid || 0)
        }));

        res.json(formattedRows);
    } catch (error) {
        console.error('❌ Error fetching history:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat: ' + error.message });
    }
};

// Get Active Loans (Diambil, Sedang Dipinjam, Terlambat)
exports.getActiveLoans = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [rows] = await pool.query(`
            SELECT 
                l.id,
                l.kodePinjam,
                l.loanDate,
                l.expectedReturnDate,
                l.status,
                b.title as bookTitle,
                u.username as borrowerName,
                u.npm,
                DATEDIFF(l.expectedReturnDate, NOW()) as daysRemaining
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.status IN ('Diambil', 'Sedang Dipinjam', 'Terlambat')
            ORDER BY l.expectedReturnDate ASC
        `);
        
        const items = rows.map(row => ({
            ...row,
            isOverdue: row.daysRemaining < 0,
            daysRemaining: row.daysRemaining
        }));
        
        res.json({ success: true, items });
    } catch (e) {
        console.error('❌ Error getting active loans:', e);
        res.status(500).json({ message: 'Gagal mengambil data peminjaman aktif.' });
    }
};

// Send Loan Reminder
exports.sendLoanReminder = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId } = req.body;
    
    if (!loanId) return res.status(400).json({ message: 'loanId diperlukan.' });
    
    try {
        const [rows] = await pool.query(`
            SELECT l.id, l.expectedReturnDate, l.status, b.title as bookTitle, u.id as userId, u.username
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.id = ? LIMIT 1
        `, [loanId]);
        
        if (!rows.length) return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        
        const loan = rows[0];
        const daysRemaining = Math.ceil((new Date(loan.expectedReturnDate) - new Date()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;
        
        const message = isOverdue 
            ? `⚠️ Peringatan: Peminjaman buku "${loan.bookTitle}" sudah terlambat ${Math.abs(daysRemaining)} hari. Segera kembalikan untuk menghindari denda.`
            : `📅 Pengingat: Buku "${loan.bookTitle}" akan jatuh tempo dalam ${daysRemaining} hari. Harap kembalikan tepat waktu.`;
        
        // Kirim notifikasi via Socket.IO
        try {
            const io = req.app.get('io');
            if (io && loan.userId) {
                io.to(`user_${loan.userId}`).emit('notification', {
                    message,
                    type: isOverdue ? 'error' : 'info',
                    loanId: loan.id,
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim reminder:', err.message);
        }
        
        // Kirim push notification ke user
        try {
            await pushController.sendPushNotification(loan.userId, 'user', {
                title: 'Pemberitahuan',
                message,
                tag: isOverdue ? 'loan-overdue' : 'loan-reminder',
                data: { loanId: loan.id, type: 'reminder' },
                requireInteraction: isOverdue
            });
        } catch (err) {
            console.warn('[PUSH][NOTIF] Gagal kirim push reminder:', err.message);
        }
        
        res.json({ success: true, message: 'Peringatan berhasil dikirim.' });
    } catch (e) {
        console.error('❌ Error sending reminder:', e);
        res.status(500).json({ message: 'Gagal mengirim peringatan.' });
    }
};

// 15. Ack Penolakan Pinjaman (POST /api/loans/rejection-notifications/ack)
exports.ackRejectionNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success:false, message:'IDs diperlukan.' });
    }
    try {
        const placeholders = ids.map(()=>'?').join(',');
        await pool.query(`UPDATE loans SET rejectionNotified = 1 WHERE user_id = ? AND id IN (${placeholders})`, [userId, ...ids]);
        res.json({ success:true });
    } catch (e){
        console.error('❌ Error ackRejectionNotifications:', e);
        res.status(500).json({ success:false, message:'Gagal update notifikasi penolakan.' });
    }
};

// 16. Submit Fine Payment (POST /api/loans/submit-fine-payment)
exports.submitFinePayment = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const { method, loanIds, totalAmount, accountName, bankName } = req.body;
    
    if (!method || !loanIds || !Array.isArray(loanIds) || loanIds.length === 0 || !totalAmount) {
        return res.status(400).json({ message: 'Data pembayaran tidak lengkap.' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Get user info
        const [users] = await connection.query('SELECT username, npm FROM users WHERE id = ? LIMIT 1', [userId]);
        if (!users.length) {
            await connection.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        
        const user = users[0];
        let proofUrl = null;
        
        // Handle file upload untuk bank_transfer
        if (method === 'bank_transfer') {
            if (!accountName) {
                await connection.rollback();
                return res.status(400).json({ message: 'Nama rekening wajib diisi untuk transfer bank.' });
            }
            
            if (req.file) {
                proofUrl = `/uploads/fine-proofs/${req.file.filename}`;
            } else {
                await connection.rollback();
                return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
            }
        }
        
        // Insert fine payment record
        const [result] = await connection.query(
            `INSERT INTO fine_payments (user_id, username, npm, method, amount_total, proof_url, loan_ids, status, account_name, bank_name, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW())`,
            [userId, user.username, user.npm, method, totalAmount, proofUrl, JSON.stringify(loanIds), accountName || null, bankName || null]
        );
        
        await connection.commit();
        
        // Send notification to user
        const message = method === 'cash' 
            ? `Permintaan pembayaran denda tunai sebesar ${formatRupiah(totalAmount)} telah dibuat. Silakan datang ke perpustakaan untuk menyelesaikan pembayaran.`
            : method === 'qris'
            ? `Pembayaran denda QRIS sebesar ${formatRupiah(totalAmount)} sedang diproses. Admin akan memverifikasi pembayaran Anda.`
            : `Bukti transfer pembayaran denda sebesar ${formatRupiah(totalAmount)} telah diterima. Admin akan memverifikasi pembayaran Anda.`;
        
        // Socket notification
        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${userId}`).emit('notification', {
                    message,
                    type: 'info',
                    paymentId: result.insertId
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO] Gagal kirim notifikasi:', err.message);
        }
        
        // Send push notification
        try {
            await pushController.sendPushNotification(userId, 'user', {
                title: 'Pembayaran Denda',
                message,
                tag: 'fine-payment',
                data: { paymentId: result.insertId, type: 'payment' }
            });
        } catch (err) {
            console.warn('[PUSH] Gagal kirim push:', err.message);
        }
        
        res.json({ 
            success: true, 
            message: 'Pembayaran berhasil diajukan.', 
            paymentId: result.insertId 
        });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error('❌ Error submitting fine payment:', e);
        res.status(500).json({ message: 'Gagal mengajukan pembayaran.' });
    } finally {
        if (connection) connection.release();
    }
};

// Get payment history for the logged-in user
exports.getPaymentHistory = async (req, res) => {
    let connection;
    try {
        const userId = req.user.id; // From checkAuth middleware

        connection = await db.promise().getConnection();
        
        const [payments] = await connection.query(
            `SELECT id, method, amount_total, status, proof_url, account_name, bank_name, 
                    admin_notes, verified_by, verified_at, created_at, updated_at
             FROM fine_payments 
             WHERE user_id = ?
             ORDER BY created_at DESC`,
            [userId]
        );

        res.json(payments);
    } catch (error) {
        console.error('❌ [getPaymentHistory] Error:', error);
        res.status(500).json({ message: 'Gagal memuat riwayat pembayaran', error: error.message });
    } finally {
        if (connection) connection.release();
    }
};
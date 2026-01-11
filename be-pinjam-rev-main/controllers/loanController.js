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
    const [cols] = await pool.query('SHOW COLUMNS FROM loans');
    const names = cols.map(c => c.Field);
    if (!names.includes('kodePinjam')) return; // tidak ada kolom, abaikan

    // Cari baris yang belum punya kodePinjam, tapi hanya untuk status yang sudah disetujui/aktif (bukan pending)
    const [missing] = await pool.query("SELECT id, loanDate FROM loans WHERE (kodePinjam IS NULL OR kodePinjam = '') AND status <> 'Menunggu Persetujuan' LIMIT 250");
    if (missing.length === 0) return; // nothing to do

    for (const row of missing) {
        const baseDate = row.loanDate ? new Date(row.loanDate) : new Date();
        const datePart = format(baseDate, 'yyyyMMdd');
        const rnd = Math.random().toString(36).substring(2,6).toUpperCase();
        const code = `KP-${datePart}-${rnd}`;
        try {
            await pool.query('UPDATE loans SET kodePinjam =: WHERE id =: AND (kodePinjam IS NULL OR kodePinjam = $3) LIMIT 1', [code, row.id, '']);
        } catch (e) {
            // Kemungkinan duplikat, coba format alternatif deterministik
            const fallback = `KP-${String(row.id).padStart(6,'0')}`;
            try { await pool.query('UPDATE loans SET kodePinjam =: WHERE id =: AND (kodePinjam IS NULL OR kodePinjam = $3) LIMIT 1', [fallback, row.id, '']); } catch {}
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
    const { bookId, purpose, returnDate } = req.body;

    if (!bookId) {
        return res.status(400).json({ message: 'ID Buku diperlukan.' });
    }

    try {
        // Cek 1: Batas Maksimal Pinjaman (3 buku aktif)
        const activeLoansResult = await pool.query(
            'SELECT COUNT(*) as count FROM loans WHERE user_id = $1 AND status IN ($2, $3, $4, $5)', 
            [userId, 'Menunggu Persetujuan', 'Disetujui', 'Diambil', 'Sedang Dipinjam']
        );
        if (parseInt(activeLoansResult.rows[0].count) >= 3) {
            return res.status(400).json({ message: 'Anda telah mencapai batas maksimal 3 pinjaman aktif/tertunda.' });
        }
        
        // Cek 2: Ketersediaan Stok & Info Buku
        const bookResult = await pool.query(
            'SELECT title, availablestock, lampiran, attachment_url FROM books WHERE id = $1', 
            [bookId]
        );
        if (bookResult.rows.length === 0 || bookResult.rows[0].availablestock <= 0) {
            return res.status(400).json({ message: 'Stok buku tidak tersedia.' });
        }
        
        const book = bookResult.rows[0];
        const isDigitalBook = book.lampiran && book.lampiran !== 'Tidak Ada' && book.attachment_url;
        
        // Cek 3: Duplikasi Permintaan (hanya untuk buku fisik)
        if (!isDigitalBook) {
            const duplicateResult = await pool.query(
                'SELECT id FROM loans WHERE user_id = $1 AND book_id = $2 AND status IN ($3, $4, $5, $6)', 
                [userId, bookId, 'Menunggu Persetujuan', 'Disetujui', 'Diambil', 'Sedang Dipinjam']
            );
            if (duplicateResult.rows.length > 0) {
                return res.status(400).json({ message: 'Anda sudah meminjam / mengajukan buku fisik ini. Kembalikan buku terlebih dahulu sebelum meminjam lagi.' });
            }
        }

        // Tentukan tanggal pinjam & estimasi kembali
        const now = new Date();
        let expectedReturnDate = null;
        
        if (!isDigitalBook && returnDate) {
            const clientReturn = new Date(returnDate);
            if (!isNaN(clientReturn.getTime())) {
                expectedReturnDate = format(clientReturn, 'yyyy-MM-dd HH:mm:ss');
            }
        }
        if (!expectedReturnDate) {
            expectedReturnDate = format(addDays(now, 7), 'yyyy-MM-dd HH:mm:ss');
        }

        // Generate kodePinjam
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const datePart = format(now, 'yyyyMMdd');
        const kodePinjam = `KP-${datePart}-${randomPart}`;
        
        // Set loanDate (waktu QR generated) dan approvedAt langsung
        const loanDateStr = format(now, 'yyyy-MM-dd HH:mm:ss');
        const approvedAtStr = format(now, 'yyyy-MM-dd HH:mm:ss');

        // Insert loan record (PostgreSQL) - Status langsung 'Disetujui' dengan loanDate & approvedAt
        const insertSQL = `
            INSERT INTO loans (user_id, book_id, loandate, expectedreturndate, status, kodepinjam, purpose, approvedat) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
        `;
        const result = await pool.query(insertSQL, [
            userId, 
            bookId,
            loanDateStr,
            expectedReturnDate, 
            'Disetujui', // Langsung disetujui otomatis
            kodePinjam, 
            purpose || null,
            approvedAtStr
        ]);

        // Kurangi Stok Tersedia
        await pool.query('UPDATE books SET availablestock = availablestock - 1 WHERE id = $1', [bookId]);

        const loanPayload = {
            id: result.rows[0].id,
            bookTitle: book.title,
            loanDate: loanDateStr, // QR sudah aktif
            expectedReturnDate,
            status: 'Disetujui',
            kodePinjam,
        };
        if (purpose) loanPayload.purpose = purpose;

        // --- TRIGGER SOCKET.IO NOTIFIKASI USER: QR Code Siap ---
        try {
            const io = req.app.get('io');
            if (io) {
                // Notif ke user bahwa QR code sudah siap
                io.to(`user_${userId}`).emit('notification', {
                    message: `QR Code untuk buku "${book.title}" sudah siap! Tunjukkan ke petugas untuk mengambil buku.`,
                    type: 'success',
                    loanId: result.rows[0].id,
                    kodePinjam: kodePinjam
                });
                
                // Notif ke admin bahwa ada pinjaman baru yang siap di-scan
                io.to('admins').emit('notification', {
                    message: `Pinjaman baru: Buku "${book.title}" oleh user ID ${userId}. QR: ${kodePinjam}`,
                    type: 'info',
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif requestLoan:', err.message);
        }
        
        res.json({
            success: true,
            message: `QR Code untuk buku "${book.title}" sudah siap! Tunjukkan QR code ke petugas untuk mengambil buku. Berlaku 24 jam.`,
            loan: loanPayload
        });

    } catch (error) {
        console.error('❌ Error requesting loan:', error);
        res.status(500).json({ message: 'Gagal memproses permintaan pinjaman: ' + error.message });
    }
};

// 2. Mendapatkan Riwayat Pinjaman User (GET /api/loans/user-history)
exports.getUserLoanHistory = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id; 

    try {
        const query = `
            SELECT 
                l.id, 
                l.loandate AS "loanDate", 
                l.expectedreturndate AS "expectedReturnDate", 
                l.actualreturndate AS "actualReturnDate", 
                l.status, 
                l.fineamount AS "fineAmount", 
                l.finepaid AS "finePaid", 
                l.returnproofurl AS "returnProofUrl", 
                l.kodepinjam AS "kodePinjam",
                b.title, 
                b.author, 
                b.kodebuku AS "kodeBuku", 
                b.image_url, 
                b.location, 
                b.lampiran, 
                b.attachment_url
            FROM loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.user_id = $1
            ORDER BY l.loandate DESC
        `;
        const result = await pool.query(query, [userId]);
        const loans = result.rows;
        
        // Cek dan update status pinjaman jika terlambat
        const today = new Date();
        const updatedLoans = loans.map(loan => {
            if (loan.status === 'Sedang Dipinjam' && loan.expectedReturnDate && isBefore(new Date(loan.expectedReturnDate), today)) {
                return { ...loan, status: 'Terlambat' };
            }
            return loan;
        });

        res.json(updatedLoans);
    } catch (error) {
        console.error('❌ Error fetching user loan history:', error);
        res.status(500).json({ message: 'Gagal mengambil riwayat pinjaman: ' + error.message });
    }
};

// 2b. Mendapatkan Semua Pinjaman User (GET /api/loans/user) - untuk tampilan tab (pending/active/history)
exports.getUserLoans = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const colsResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'loans'");
        const cols = colsResult.rows;
        const names = cols.map(c => c.column_name);
        
        // Build SELECT with proper PostgreSQL lowercase column names
        const selectParts = [
            'l.id',
            'l.loandate AS "loanDate"',
            'l.expectedreturndate AS "returnDate"',
            'l.actualreturndate AS "actualReturnDate"',
            'l.status',
            'l.fineamount AS "fineAmount"',
            'l.returndecision AS "returnDecision"'
        ];
        
        if (names.includes('kodepinjam')) selectParts.push('l.kodepinjam AS "kodePinjam"');
        if (names.includes('purpose')) selectParts.push('l.purpose');
        if (names.includes('finepaid')) selectParts.push('l.finepaid AS "finePaid"');
        if (names.includes('finepaymentstatus')) selectParts.push('l.finepaymentstatus AS "finePaymentStatus"');
        if (names.includes('finepaymentmethod')) selectParts.push('l.finepaymentmethod AS "finePaymentMethod"');
        if (names.includes('finepaymentproof')) selectParts.push('l.finepaymentproof AS "finePaymentProof"');
        if (names.includes('finereason')) selectParts.push('l.finereason AS "fineReason"');
        if (names.includes('returnproofurl')) selectParts.push('l.returnproofurl AS "returnProofUrl"');
        
        // Book columns with proper aliases
        selectParts.push(
            'b.title AS "bookTitle"',
            'b.kodebuku AS "kodeBuku"',
            'b.author',
            'b.location',
            'b.lampiran',
            'b.attachment_url'
        );
        
        const query = `SELECT ${selectParts.join(', ')} FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = $1 ORDER BY l.loandate DESC`;
        const result = await pool.query(query, [userId]);
        const rows = result.rows;
        
        // Auto-cancel expired QR codes
        const now = new Date();
        for (const loan of rows) {
            if (loan.status === 'Disetujui' && loan.loanDate) {
                const loanTime = new Date(loan.loanDate).getTime();
                const expiry = loanTime + 24 * 60 * 60 * 1000;
                if (now.getTime() > expiry) {
                    // QR expired, auto-cancel
                    await pool.query(
                        'UPDATE loans SET status = $1 WHERE id = $2',
                        ['Ditolak', loan.id]
                    );
                    // Kembalikan stok
                    await pool.query(
                        'UPDATE books SET availablestock = availablestock + 1 WHERE id = (SELECT book_id FROM loans WHERE id = $1)',
                        [loan.id]
                    );
                    console.log(`[AUTO-CANCEL] Loan ID ${loan.id} expired and auto-canceled`);
                    loan.status = 'Ditolak';
                }
            }
        }
        
        // Debug: Log loans with fines for troubleshooting
        const loansWithFines = rows.filter(loan => loan.fineAmount > 0);
        console.log(`💰 [getUserLoans] User ${userId} - Total loans: ${rows.length}, With fines: ${loansWithFines.length}`);
        if (loansWithFines.length > 0) {
            console.log('💰 [getUserLoans] Found loans with fines:', loansWithFines.map(l => ({
                id: l.id,
                bookTitle: l.bookTitle,
                status: l.status,
                fineAmount: l.fineAmount,
                finePaid: l.finePaid,
                fineReason: l.fineReason,
                actualReturnDate: l.actualReturnDate
            })));
        } else {
            console.log(`💰 [getUserLoans] No loans with fines found for user ${userId}`);
        }
        
        res.json(rows);
    } catch (error) {
        console.error('❌ Error fetching user loans:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar pinjaman: ' + error.message });
    }
};

// 2c. Batalkan Peminjaman (POST /api/loans/:id/cancel)
exports.cancelLoan = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    const loanId = req.params.id;

    // PostgreSQL uses pool directly
    try {
        // No getConnection needed
        // No transactions for now

        // Cek kepemilikan dan status
        const loansResult = await pool.query(
            'SELECT status, book_id FROM loans WHERE id = $1 AND user_id = $2',
            [loanId, userId]
        );
        const loans = loansResult.rows;

        if (loans.length === 0) {
            // No rollback
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan atau bukan milik Anda.' });
        }

        const loan = loans[0];
        
        // Hanya bisa cancel jika status Menunggu Persetujuan atau Disetujui
        if (loan.status !== 'Menunggu Persetujuan' && loan.status !== 'Disetujui') {
            // No rollback
            return res.status(400).json({ message: 'Peminjaman tidak dapat dibatalkan pada status ini.' });
        }

        // Update status menjadi Ditolak (cancelled by user)
        await pool.query(
            'UPDATE loans SET status = $1 WHERE id = $2',
            ['Ditolak', loanId]
        );

        // Kembalikan stok buku
        await pool.query(
            'UPDATE books SET availablestock = availablestock + 1 WHERE id = $1',
            [loan.book_id]
        );

        console.log(`✅ [cancelLoan] Loan ${loanId} cancelled successfully by user ${userId}`);
        
        // No commit
        res.json({ success: true, message: 'Peminjaman berhasil dibatalkan.' });
    } catch (error) {
        // PostgreSQL - No explicit rollback needed
        console.error('❌ Error canceling loan:', error);
        res.status(500).json({ message: 'Gagal membatalkan peminjaman.' });
    } finally {
        // PostgreSQL - No connection release needed
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
        const _pgResult = await pool.query(
            "SELECT status, returnProofUrl FROM loans WHERE id = $1 AND user_id = $2",
            [loanId, userId]
        );
        const loans = _pgResult.rows;

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
        const result = await pool.query(
            "UPDATE loans SET status = $1, readyReturnDate = $2, returnProofUrl = $3, returnProofMetadata = $4 WHERE id = $5 AND user_id = $6",
            ['Siap Dikembalikan', new Date(), proofUrl, metadata ? JSON.stringify(metadata) : null, loanId, userId]
        );

        if (result.rowCount > 0) {
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
        const _pgResult = await pool.query('SELECT expectedReturnDate, kodePinjam, user_id, book_id FROM loans WHERE id = $3', [loanId]);
        const rows = _pgResult.rows;
        if (!rows.length) return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        const currentExpected = rows[0].expectedReturnDate;
        const expected = currentExpected || addDays(now, 7);
        let kode = rows[0].kodePinjam;
        if (!kode || kode === '') {
            const datePart = format(now, 'yyyyMMdd');
            const rnd = Math.random().toString(36).substring(2,6).toUpperCase();
            kode = `KP-${datePart}-${rnd}`;
            try { await pool.query('UPDATE loans SET kodePinjam=$1 WHERE id=$2',[kode, loanId]); } catch {}
        }
        // Set status Disetujui, set approvedAt, jangan set loanDate di tahap ini
        const result = await pool.query(
            "UPDATE loans SET status = 'Disetujui', expectedReturnDate = $1, approvedAt = $2, userNotified = FALSE WHERE id = $3 AND status = 'Menunggu Persetujuan'",
            [expected, now, loanId]
        );
        if (result.rowCount === 0) {
            const [exist] = await pool.query('SELECT status FROM loans WHERE id = $1',[loanId]);
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
                const [bookRows] = await pool.query('SELECT title FROM books WHERE id = $1', [rows[0].book_id]);
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
        const _pgResult = await pool.query(`
            SELECT l.id, l.status, l.loanDate, l.approvedAt, l.book_id as bookId, l.user_id as userId,
                   b.title as "bookTitle",
                   u.username as "borrowerName"
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.kodePinjam = $1 LIMIT 1
        `, [kodePinjam]);
        const rows = _pgResult.rows;
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
        
        // Check QR expiry based on approvedAt + 24h
        if (loan.approvedAt) {
            const approvedTime = new Date(loan.approvedAt).getTime();
            const nowTime = Date.now();
            if (nowTime > approvedTime + 24 * 60 * 60 * 1000) {
                return res.status(400).json({ 
                    message:'QR Expired. Kode pinjam sudah melewati masa berlaku 24 jam sejak disetujui.',
                    bookTitle: loan.bookTitle || 'Tidak Diketahui',
                    borrowerName: loan.borrowerName || 'Tidak Diketahui',
                    approvedAt: loan.approvedAt
                });
            }
        }
        
        const now = new Date();
        await pool.query("UPDATE loans SET status = 'Diambil', loanDate = $1 WHERE id = $2", [now, loan.id]);
        
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
        const _pgResult = await pool.query('SELECT status, loanDate, expectedReturnDate FROM loans WHERE id =: LIMIT 1',[loanId]);
        const rows = _pgResult.rows;
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
        await pool.query("UPDATE loans SET status='Sedang Dipinjam', expectedReturnDate =: WHERE id = $2", [newExpected, loanId]);
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

    // PostgreSQL uses pool directly
    try {
        // No getConnection needed
        // No transactions for now

        // Ambil info buku & user sebelum update status
        const loanInfoResult = await pool.query(`
            SELECT l.book_id, b.title 
            FROM loans l JOIN books b ON l.book_id = b.id 
            WHERE l.id = $1 AND l.status = 'Menunggu Persetujuan'`, [loanId]);
        const loanInfo = loanInfoResult.rows;

        if (loanInfo.length === 0) {
            // No rollback
            return res.status(404).json({ message: 'Pinjaman tertunda tidak ditemukan atau sudah diproses.' });
        }

        // 1. Update status pinjaman
        const result = await pool.query(
            "UPDATE loans SET status = $1, rejectionDate = $2, rejectionNotified = FALSE WHERE id = $3 AND status = 'Menunggu Persetujuan'",
            ['Ditolak', new Date(), loanId]
        );
        
        // 2. Tambah kembali stok buku
        await pool.query('UPDATE books SET availableStock = availableStock + 1 WHERE id = $1', [loanInfo[0].book_id]);

        // No commit
        res.json({ success: true, message: `Permintaan pinjaman buku "${loanInfo[0].title}" berhasil ditolak.` });

    } catch (error) {
        // PostgreSQL - No explicit rollback needed
        console.error('❌ Error rejecting loan:', error);
        res.status(500).json({ message: 'Gagal menolak pinjaman.' });
    } finally {
        // PostgreSQL - No connection release needed
    }
};


// 8. Memproses Pengembalian (POST /api/admin/returns/process)
exports.processReturn = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId, manualFineAmount = 0, fineReason = '' } = req.body; // Admin bisa input denda manual + alasan

    if (!loanId) {
        return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });
    }

    // PostgreSQL uses pool directly
    try {
        // No getConnection needed
        // No transactions for now
        const actualReturnDate = new Date();

        // 1. Ambil data pinjaman untuk perhitungan denda otomatis
        const _pgResult = await pool.query(
            "SELECT l.expectedReturnDate, l.book_id, l.user_id, u.denda, b.title FROM loans l JOIN users u ON l.user_id = u.id JOIN books b ON l.book_id = b.id WHERE l.id = $1 AND l.status IN ($2, $3, $4)",
            [loanId, 'Sedang Dipinjam', 'Terlambat', 'Siap Dikembalikan']
        );
        const loanData = _pgResult.rows;

        if (loanData.length === 0) {
            // No rollback
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan atau sudah dikembalikan.' });
        }

        const { expectedReturnDate, book_id, user_id, denda: userCurrentFine, title: bookTitle } = loanData[0];
        
        // Hitung denda keterlambatan (Otomatis)
        const autoPenalty = calculatePenalty(expectedReturnDate, actualReturnDate) || 0;
        
        // Total Denda = Denda Otomatis + Denda Manual (default 0 jika undefined/null/NaN)
        const parsedManualFine = Number(manualFineAmount) || 0;
        const totalFine = (autoPenalty || 0) + parsedManualFine;
        
        console.log('💰 [processReturn] Penalty calculation:', { 
            expectedReturnDate, 
            actualReturnDate, 
            autoPenalty, 
            manualFineAmount, 
            parsedManualFine, 
            totalFine 
        }); 

        // 2. Update status pinjaman menjadi 'Dikembalikan', simpan denda & tanggal pengembalian
        await pool.query(
            "UPDATE loans SET status = $1, actualReturnDate = $2, fineAmount = $3, finePaid = $4, returnNotified = FALSE, returnDecision = 'approved', fineReason = $5 WHERE id = $6",
            ['Dikembalikan', actualReturnDate, totalFine, 0, fineReason, loanId] // finePaid 0 karena belum dibayar
        );
        
        console.log('✅ [processReturn] Loan updated successfully:', { loanId, totalFine, status: 'Dikembalikan' });
        
        // 3. Tambahkan total denda ke akun user
        let totalNewFine = 0;
       if (totalFine > 0) {
           await pool.query('UPDATE users SET denda = denda + $1, denda_unpaid = denda_unpaid + $2 WHERE id = $3', [totalFine, totalFine, user_id]);
           totalNewFine = totalFine;
       }

        // 4. Tambah stok buku kembali
        await pool.query('UPDATE books SET availableStock = availableStock + 1 WHERE id = $1', [book_id]);

        // No commit
        
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
        // PostgreSQL - No explicit rollback needed
        console.error('❌ Error processing return:', error);
        res.status(500).json({ message: 'Gagal memproses pengembalian buku.' });
    } finally {
        // PostgreSQL - No connection release needed
    }
};

// 8b. Menolak Bukti Pengembalian (POST /api/admin/returns/reject)
// Efek: Jika status loan 'Siap Dikembalikan', kembalikan ke status berjalan ('Sedang Dipinjam' atau 'Terlambat' tergantung due date), kosongkan returnProofUrl & readyReturnDate
exports.rejectReturnProof = async (req, res) => {
    const pool = getDBPool(req);
    const { loanId, reason = '', fineAmount = 0 } = req.body; // Admin bisa kasih alasan + denda
    if (!loanId) return res.status(400).json({ message: 'ID Pinjaman diperlukan.' });

    // PostgreSQL uses pool directly
    try {
        // No getConnection needed
        // No transactions for now

        const _pgResult = await pool.query(
            `SELECT id, expectedReturnDate, status, user_id FROM loans WHERE id=$1`,
            [loanId]
        );
        const rows = _pgResult.rows;
        if (!rows.length) {
            // No rollback
            return res.status(404).json({ message: 'Pinjaman tidak ditemukan.' });
        }
        const loan = rows[0];
        if (loan.status !== 'Siap Dikembalikan') {
            // No rollback
            return res.status(400).json({ message: `Status sekarang '${loan.status}'. Hanya 'Siap Dikembalikan' yang bisa ditolak bukti pengembaliannya.` });
        }

        // Tentukan status berjalan setelah ditolak
        const now = new Date();
        const due = loan.expectedReturnDate ? new Date(loan.expectedReturnDate) : null;
        const nextStatus = (due && now > due) ? 'Terlambat' : 'Sedang Dipinjam';

        await pool.query(
            `UPDATE loans SET status=$1, returnProofUrl=NULL, readyReturnDate=NULL, returnNotified = FALSE, returnDecision = 'rejected', rejectionReason=$2, rejectionDate=CURRENT_TIMESTAMP WHERE id=$3`,
            [nextStatus, reason, loanId]
        );

        // Tambah denda jika admin kasih denda
        let user_id = loan.user_id;
        if (fineAmount > 0) {
            await pool.query(
                `UPDATE loans SET fineAmount = fineAmount + $1 WHERE id=$2`,
                [fineAmount, loanId]
            );
            await pool.query(
                `UPDATE users SET denda = denda + $1, denda_unpaid = denda_unpaid + $2 WHERE id = $3`,
                [fineAmount, fineAmount, user_id]
            );
        }

        // No commit

        // --- TRIGGER SOCKET.IO NOTIFIKASI USER: Bukti pengembalian ditolak ---
        try {
            // Ambil user_id dan judul buku
            const _pgLoanResult = await pool.query(
                `SELECT l.user_id, b.title FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = $1`,
                [loanId]
            );
            const loanRows = _pgLoanResult.rows;
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
        // PostgreSQL - No explicit rollback needed
        console.error('❌ Error rejectReturnProof:', e);
        res.status(500).json({ message: 'Gagal menolak bukti pengembalian.' });
    } finally {
        // PostgreSQL - No connection release needed
    }
};

// 9. Notifikasi Approval Peminjaman (GET /api/loans/notifications)
exports.getApprovalNotifications = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    try {
        const _pgResult = await pool.query(
            `SELECT id, book_id, approvedAt, status, kodePinjam FROM loans 
             WHERE user_id = $1 AND approvedAt IS NOT NULL AND userNotified = FALSE AND status IN ('Sedang Dipinjam','Diambil','Disetujui')
             ORDER BY approvedAt DESC LIMIT 20`,
            [userId]
        );
        const rows = _pgResult.rows;
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
        await pool.query(`UPDATE loans SET userNotified = 1 WHERE user_id =: AND id IN (${placeholders})`, [userId, ...ids]);
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
        const _pgResult = await pool.query(
            `SELECT l.id, l.status, l.returnDecision, l.actualReturnDate, l.fineAmount, b.title AS bookTitle
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = $1 AND l.returnNotified = FALSE AND l.returnDecision IS NOT NULL
             ORDER BY l.actualReturnDate DESC LIMIT 20`,
            [userId]
        );
        const rows = _pgResult.rows;
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
        const placeholders = ids.map((_, i) => `$${i + 2}`).join(',');
        await pool.query(`UPDATE loans SET returnNotified = TRUE WHERE user_id = $1 AND id IN (${placeholders})`, [userId, ...ids]);
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
            const colResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='loans' AND column_name='returnproofmetadata'");
            const cols = colResult.rows;
            hasMetadataCol = cols.length > 0;
        } catch (e) {
            console.warn('Failed to check returnProofMetadata column:', e.message);
        }

        const metadataField = hasMetadataCol ? ', l.returnProofMetadata' : '';

        const _pgResult = await pool.query(
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
             WHERE l.user_id = $1 AND (
                    (l.approvedAt IS NOT NULL) OR
                                        (l.returnDecision IS NOT NULL) OR
                                        (l.rejectionDate IS NOT NULL)
               )
                         ORDER BY COALESCE(l.actualReturnDate, l.approvedAt, l.rejectionDate, l.createdAt) DESC
             LIMIT 100`,
            [userId]
        );
        const rows = _pgResult.rows;
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
        const _pgResult = await pool.query(
            `SELECT l.id, l.status, l.rejectionDate, b.title AS bookTitle
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = $1 AND l.status = 'Ditolak' AND l.rejectionDate IS NOT NULL AND (l.rejectionNotified = FALSE OR l.rejectionNotified IS NULL)
             ORDER BY l.rejectionDate DESC LIMIT 20`,
            [userId]
        );
        const rows = _pgResult.rows;
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
            let _pgResult = await pool.query(query);
        const rows = _pgResult.rows;
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
        const _pgResult = await pool.query(`
            SELECT 
                l.id,
                l.kodePinjam,
                l.loanDate,
                l.expectedReturnDate,
                l.status,
                b.title as bookTitle,
                u.username as borrowerName,
                u.npm,
                DATEDIFF(l.expectedReturnDate, CURRENT_TIMESTAMP) as daysRemaining
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.status IN ('Diambil', 'Sedang Dipinjam', 'Terlambat')
            ORDER BY l.expectedReturnDate ASC
        `);
        const rows = _pgResult.rows;
        
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
        const _pgResult = await pool.query(`
            SELECT l.id, l.expectedReturnDate, l.status, b.title as bookTitle, u.id as userId, u.username
            FROM loans l
            LEFT JOIN books b ON l.book_id = b.id
            LEFT JOIN users u ON l.user_id = u.id
            WHERE l.id =: LIMIT 1
        `, [loanId]);
        const rows = _pgResult.rows;
        
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
        await pool.query(`UPDATE loans SET rejectionNotified = 1 WHERE user_id =: AND id IN (${placeholders})`, [userId, ...ids]);
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
    let { method, loanIds, totalAmount, accountName, bankName } = req.body;
    
    // Parse loanIds if it's a string (from FormData)
    if (typeof loanIds === 'string') {
        try {
            loanIds = JSON.parse(loanIds);
        } catch (e) {
            return res.status(400).json({ message: 'Format loanIds tidak valid.' });
        }
    }
    
    // Parse totalAmount if it's a string
    if (typeof totalAmount === 'string') {
        totalAmount = parseFloat(totalAmount);
    }
    
    if (!method || !loanIds || !Array.isArray(loanIds) || loanIds.length === 0 || !totalAmount) {
        return res.status(400).json({ 
            message: 'Data pembayaran tidak lengkap.',
            debug: { method, loanIds: typeof loanIds, loanIdsValue: loanIds, totalAmount: typeof totalAmount }
        });
    }
    
    // PostgreSQL uses pool directly
    try {
        // Get user info
        const userResult = await pool.query('SELECT username, npm FROM users WHERE id = $1 LIMIT 1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }
        
        const user = userResult.rows[0];
        let proofUrl = null;
        
        // Handle file upload untuk bank_transfer
        if (method === 'bank_transfer') {
            if (!accountName) {
                return res.status(400).json({ message: 'Nama rekening wajib diisi untuk transfer bank.' });
            }
            
            if (req.file) {
                proofUrl = `/uploads/fine-proofs/${req.file.filename}`;
            } else {
                return res.status(400).json({ message: 'Bukti transfer wajib diupload.' });
            }
        }
        
        // Insert fine payment record
        const result = await pool.query(
            `INSERT INTO fine_payments (user_id, username, npm, method, amount_total, proof_url, loan_ids, status, account_name, bank_name, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, CURRENT_TIMESTAMP) RETURNING id`,
            [userId, user.username, user.npm, method, totalAmount, proofUrl, JSON.stringify(loanIds), accountName || null, bankName || null]
        );
        
        const paymentId = result.rows[0]?.id;
        
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
                    paymentId
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
                data: { paymentId, type: 'payment' }
            });
        } catch (err) {
            console.warn('[PUSH] Gagal kirim push:', err.message);
        }
        
        res.json({ 
            success: true, 
            message: 'Pembayaran berhasil diajukan.', 
            paymentId 
        });
    } catch (e) {
        console.error('❌ [submitFinePayment] Error:', e);
        res.status(500).json({ message: 'Gagal mengajukan pembayaran.', error: e.message });
    }
};

// Get payment history for the logged-in user
exports.getPaymentHistory = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const userId = req.user.id; // From checkAuth middleware
        
        const result = await pool.query(
            `SELECT id, method, amount_total, status, proof_url, account_name, bank_name, 
                    admin_notes, verified_by, verified_at, created_at, updated_at
             FROM fine_payments 
             WHERE user_id = $1 ORDER BY created_at DESC`,
            [userId]
        );
        const payments = result.rows;

        res.json(payments);
    } catch (error) {
        console.error('❌ [getPaymentHistory] Error:', error);
        res.status(500).json({ message: 'Gagal memuat riwayat pembayaran', error: error.message });
    }
};

// Get user activity history (loans, returns, fines) for last 2 months
exports.getUserActivityHistory = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.user.id;
    
    try {
        // Calculate 2 months ago from now
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        // Get all loans from last 2 months with book info
        const loansResult = await pool.query(
            `SELECT 
                l.id,
                l.kodepinjam AS "kodePinjam",
                l.loandate AS "loanDate",
                l.expectedreturndate AS "expectedReturnDate",
                l.actualreturndate AS "actualReturnDate",
                l.status,
                l.fineamount AS "fineAmount",
                l.finepaid AS "finePaid",
                l.finereason AS "fineReason",
                l.createdat AS "createdAt",
                b.title AS "bookTitle",
                b.author,
                b.kodebuku AS "kodeBuku"
             FROM loans l
             JOIN books b ON l.book_id = b.id
             WHERE l.user_id = $1 
                AND l.createdat >= $2
             ORDER BY l.createdat DESC`,
            [userId, twoMonthsAgo]
        );
        
        // Get fine payments from last 2 months
        const paymentsResult = await pool.query(
            `SELECT 
                id,
                method,
                amount_total AS "amountTotal",
                status,
                created_at AS "createdAt",
                verified_at AS "verifiedAt",
                admin_notes AS "adminNotes"
             FROM fine_payments
             WHERE user_id = $1
                AND created_at >= $2
             ORDER BY created_at DESC`,
            [userId, twoMonthsAgo]
        );
        
        // Combine and format activity data
        const activities = [];
        
        // Add loan activities
        loansResult.rows.forEach(loan => {
            // Loan request activity
            activities.push({
                type: 'loan_request',
                date: loan.createdAt,
                loanId: loan.id,
                kodePinjam: loan.kodePinjam,
                bookTitle: loan.bookTitle,
                author: loan.author,
                status: loan.status,
                description: `Meminjam buku "${loan.bookTitle}"`
            });
            
            // Return activity if returned
            if (loan.actualReturnDate) {
                activities.push({
                    type: 'return',
                    date: loan.actualReturnDate,
                    loanId: loan.id,
                    kodePinjam: loan.kodePinjam,
                    bookTitle: loan.bookTitle,
                    author: loan.author,
                    status: loan.status,
                    fineAmount: loan.fineAmount,
                    finePaid: loan.finePaid,
                    fineReason: loan.fineReason,
                    description: `Mengembalikan buku "${loan.bookTitle}"${loan.fineAmount > 0 ? ` (Denda: Rp ${loan.fineAmount.toLocaleString('id-ID')})` : ''}`
                });
            }
        });
        
        // Add fine payment activities
        paymentsResult.rows.forEach(payment => {
            activities.push({
                type: 'fine_payment',
                date: payment.createdAt,
                paymentId: payment.id,
                method: payment.method,
                amount: payment.amountTotal,
                status: payment.status,
                verifiedAt: payment.verifiedAt,
                adminNotes: payment.adminNotes,
                description: `Pembayaran denda Rp ${payment.amountTotal.toLocaleString('id-ID')} (${payment.method === 'qris' ? 'QRIS' : payment.method === 'bank_transfer' ? 'Transfer Bank' : 'Tunai'})`
            });
        });
        
        // Sort all activities by date (newest first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        res.json({
            success: true,
            activities,
            totalActivities: activities.length,
            periodStart: twoMonthsAgo,
            periodEnd: new Date()
        });
    } catch (error) {
        console.error('❌ [getUserActivityHistory] Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Gagal memuat riwayat aktivitas', 
            error: error.message 
        });
    }
};

// Get active loans list for admin (Diambil, Sedang Dipinjam, Terlambat)
exports.getActiveLoansList = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result = await pool.query(`
            SELECT 
                l.id, 
                l.user_id AS "userId", 
                l.book_id AS "bookId", 
                l.kodepinjam AS "kodePinjam", 
                l.loandate AS "loanDate", 
                l.expectedreturndate AS "expectedReturnDate", 
                l.status, 
                l.purpose, 
                l.createdat AS "createdAt",
                u.npm, 
                u.username AS "borrowerName", 
                u.fakultas,
                b.title AS "bookTitle", 
                b.author AS "bookAuthor", 
                b.kodebuku AS "bookCode"
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status IN ('Diambil', 'Sedang Dipinjam', 'Terlambat')
            ORDER BY l.loandate DESC
        `);
        
        console.log(`✅ [getActiveLoansList] Found ${result.rows.length} active loans`);
        res.json({ success: true, items: result.rows });
    } catch (error) {
        console.error('❌ [getActiveLoansList] Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat pinjaman aktif: ' + error.message });
    }
};

// Get returns for review (Siap Dikembalikan, Sedang Dipinjam dengan return proof)
exports.getReturnsForReview = async (req, res) => {
    console.log('🔍 [getReturnsForReview] Called');
    const pool = getDBPool(req);
    try {
        const result = await pool.query(`
            SELECT 
                l.id AS "loanId", 
                l.user_id AS "userId", 
                l.book_id AS "bookId", 
                l.kodepinjam AS "kodePinjam", 
                l.loandate AS "loanDate", 
                l.expectedreturndate AS "returnDate",
                l.status, 
                l.returnproofurl AS "proofUrl",
                l.returnproofmetadata AS "returnProofMetadata", 
                l.actualreturndate AS "actualReturnDate", 
                l.createdat AS "createdAt",
                u.npm AS "userNpm", 
                u.username AS "userName", 
                u.fakultas,
                b.title AS "bookTitle", 
                b.author AS "bookAuthor", 
                b.kodebuku AS "bookCode"
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE (l.status = 'Siap Dikembalikan') 
               OR (l.status IN ('Sedang Dipinjam', 'Terlambat') AND l.returnproofurl IS NOT NULL)
            ORDER BY l.actualreturndate DESC, l.loandate DESC
        `);
        
        console.log('✅ [getReturnsForReview] Found:', result.rows?.length || 0, 'returns');
        res.json({ success: true, returns: result.rows });
    } catch (error) {
        console.error('❌ [getReturnsForReview] Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat pengembalian: ' + error.message });
    }
};

// Get history (Dikembalikan, Ditolak, Dibatalkan)
exports.getHistory = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result = await pool.query(`
            SELECT 
                l.id, 
                l.user_id AS "userId", 
                l.book_id AS "bookId", 
                l.kodepinjam AS "kodePinjam", 
                l.loandate AS "loanDate", 
                l.expectedreturndate AS "expectedReturnDate",
                l.actualreturndate AS "actualReturnDate",
                l.status, 
                l.fineamount AS "fineAmount",
                l.returndecision AS "returnDecision",
                l.createdat AS "createdAt",
                u.npm, 
                u.username AS "borrowerName", 
                u.fakultas,
                b.title AS "bookTitle", 
                b.author AS "bookAuthor", 
                b.kodebuku AS "bookCode"
            FROM loans l
            JOIN users u ON l.user_id = u.id
            JOIN books b ON l.book_id = b.id
            WHERE l.status IN ('Dikembalikan', 'Ditolak')
            ORDER BY COALESCE(l.actualreturndate, l.createdat) DESC
        `);
        
        console.log(`✅ [getHistory] Found ${result.rows.length} history records`);
        res.json({ success: true, items: result.rows });
    } catch (error) {
        console.error('❌ [getHistory] Error:', error);
        res.status(500).json({ success: false, message: 'Gagal memuat riwayat: ' + error.message });
    }
};

// Verify fine payment (Admin only)
exports.verifyFinePayment = async (req, res) => {
    const pool = getDBPool(req);
    const paymentId = parseInt(req.params.id);
    const { status, adminNotes } = req.body; // status: 'approved' or 'rejected'
    const adminId = req.user.id;
    const adminUsername = req.user.username;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Status harus "approved" atau "rejected".' });
    }
    
    try {
        // Get payment details
        const paymentResult = await pool.query(
            'SELECT * FROM fine_payments WHERE id = $1',
            [paymentId]
        );
        
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Pembayaran tidak ditemukan.' });
        }
        
        const payment = paymentResult.rows[0];
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ message: 'Pembayaran sudah diverifikasi sebelumnya.' });
        }
        
        // Update payment status
        await pool.query(
            `UPDATE fine_payments 
             SET status = $1, admin_notes = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [status, adminNotes || null, adminUsername, paymentId]
        );
        
        // If approved, update finePaid in loans table
        if (status === 'approved') {
            const loanIds = JSON.parse(payment.loan_ids);
            
            for (const loanId of loanIds) {
                await pool.query(
                    `UPDATE loans SET finepaid = true WHERE id = $1`,
                    [loanId]
                );
            }
            
            console.log(`✅ [verifyFinePayment] Approved payment ${paymentId}, updated ${loanIds.length} loans`);
        }
        
        // Send notification to user
        const pushController = require('./pushController');
        const message = status === 'approved'
            ? `Pembayaran denda Anda sebesar Rp ${payment.amount_total.toLocaleString('id-ID')} telah disetujui.`
            : `Pembayaran denda Anda ditolak. ${adminNotes || 'Silakan hubungi admin untuk informasi lebih lanjut.'}`;
        
        try {
            const io = req.app.get('io');
            if (io) {
                io.to(`user_${payment.user_id}`).emit('notification', {
                    message,
                    type: status === 'approved' ? 'success' : 'warning',
                    paymentId
                });
            }
        } catch (err) {
            console.warn('[SOCKET.IO] Gagal kirim notifikasi:', err.message);
        }
        
        try {
            await pushController.sendPushNotification(payment.user_id, 'user', {
                title: 'Verifikasi Pembayaran Denda',
                message,
                tag: 'fine-verification',
                data: { paymentId, status }
            });
        } catch (err) {
            console.warn('[PUSH] Gagal kirim push:', err.message);
        }
        
        res.json({ 
            success: true, 
            message: `Pembayaran berhasil ${status === 'approved' ? 'disetujui' : 'ditolak'}.` 
        });
    } catch (e) {
        console.error('❌ [verifyFinePayment] Error:', e);
        res.status(500).json({ message: 'Gagal memverifikasi pembayaran.', error: e.message });
    }
};

// Get all fine payments for admin
exports.getAllFinePayments = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result = await pool.query(
            `SELECT fp.*, u.username, u.npm 
             FROM fine_payments fp 
             JOIN users u ON fp.user_id = u.id 
             ORDER BY fp.created_at DESC`
        );
        
        res.json(result.rows);
    } catch (e) {
        console.error('❌ [getAllFinePayments] Error:', e);
        res.status(500).json({ message: 'Gagal memuat daftar pembayaran denda.', error: e.message });
    }
};

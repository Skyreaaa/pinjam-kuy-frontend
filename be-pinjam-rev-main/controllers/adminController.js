exports.getStats = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalBooks }]] = await pool.query('SELECT COUNT(*) as totalBooks FROM books');
        const [[{ totalLoans }]] = await pool.query('SELECT COUNT(*) as totalLoans FROM loans');
        const [[{ totalReturns }]] = await pool.query("SELECT COUNT(*) as totalReturns FROM loans WHERE status='Dikembalikan'");
        const [[{ totalFines }]] = await pool.query('SELECT SUM(fineAmount) as totalFines FROM loans WHERE fineAmount > 0');
        res.json({
            totalUsers: totalUsers || 0,
            totalBooks: totalBooks || 0,
            totalLoans: totalLoans || 0,
            totalReturns: totalReturns || 0,
            totalFines: totalFines || 0
        });
    } catch (e) {
        console.error('[ADMIN][STATS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil statistik.' });
    }
};
// Statistik/Laporan untuk dashboard admin
exports.getStats = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
        const [[{ totalBooks }]] = await pool.query('SELECT COUNT(*) as totalBooks FROM books');
        const [[{ totalLoans }]] = await pool.query('SELECT COUNT(*) as totalLoans FROM loans');
        const [[{ totalReturns }]] = await pool.query("SELECT COUNT(*) as totalReturns FROM loans WHERE status='Dikembalikan'");
        const [[{ totalFines }]] = await pool.query('SELECT SUM(fineAmount) as totalFines FROM loans WHERE fineAmount > 0');
        res.json({
            totalUsers: totalUsers || 0,
            totalBooks: totalBooks || 0,
            totalLoans: totalLoans || 0,
            totalReturns: totalReturns || 0,
            totalFines: totalFines || 0
        });
    } catch (e) {
        console.error('[ADMIN][STATS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil statistik.' });
    }
};

// 1. Top 5 Most Borrowed Books
exports.getTopBooks = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [rows] = await pool.query(`
            SELECT b.id, b.title, b.author, b.category, COUNT(l.id) as borrowCount
            FROM books b
            LEFT JOIN loans l ON l.book_id = b.id
            GROUP BY b.id, b.title, b.author, b.category
            ORDER BY borrowCount DESC
            LIMIT 5
        `);
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][TOP_BOOKS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data buku teratas.' });
    }
};

// 2. Monthly Activity (Loans & Returns per Month)
exports.getMonthlyActivity = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [loans] = await pool.query(`
            SELECT DATE_FORMAT(createdAt, '%Y-%m') as month, COUNT(*) as loanCount
            FROM loans
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        const [returns] = await pool.query(`
            SELECT DATE_FORMAT(updatedAt, '%Y-%m') as month, COUNT(*) as returnCount
            FROM loans
            WHERE status = 'Dikembalikan'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        res.json({ loans, returns });
    } catch (e) {
        console.error('[ADMIN][MONTHLY_ACTIVITY] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data aktivitas bulanan.' });
    }
};

// 3. Active Loans Count
exports.getActiveLoans = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [[{ activeLoans }]] = await pool.query(`
            SELECT COUNT(*) as activeLoans FROM loans WHERE status IN ('Sedang Dipinjam', 'Terlambat', 'Siap Dikembalikan')
        `);
        res.json({ activeLoans });
    } catch (e) {
        console.error('[ADMIN][ACTIVE_LOANS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil jumlah pinjaman aktif.' });
    }
};

// 4. Outstanding Fines Summary
exports.getOutstandingFines = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [[{ totalOutstandingFines }]] = await pool.query(`
            SELECT SUM(fineAmount) as totalOutstandingFines FROM loans WHERE fineAmount > 0 AND (finePaid IS NULL OR finePaid = 0)
        `);
        res.json({ totalOutstandingFines: totalOutstandingFines || 0 });
    } catch (e) {
        console.error('[ADMIN][OUTSTANDING_FINES] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data denda outstanding.' });
    }
};

// 5. Notification Statistics (last 30 days)
exports.getNotificationStats = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [rows] = await pool.query(`
            SELECT DATE(createdAt) as date, COUNT(*) as notifCount
            FROM user_notifications
            WHERE createdAt >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            GROUP BY date
            ORDER BY date DESC
        `);
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][NOTIF_STATS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil statistik notifikasi.' });
    }
};
// File: controllers/adminController.js (KODE BERSIH, HANYA KELOLA PENGGUNA & DENDA)

const getDBPool = (req) => req.app.get('dbPool');
const bcrypt = require('bcrypt');
const { format, addDays } = require('date-fns');

// Helper untuk format Rupiah
const formatRupiah = (amount) => {
    const num = Number(amount);
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
};

// =========================================================
//                       KELOLA PENGGUNA (CRUD & Denda)
// =========================================================

// 1. Mendapatkan Semua Pengguna (GET /api/admin/users)
exports.getAllUsers = async (req, res) => {
    const pool = getDBPool(req);
    try {
        // Query user
        const userQuery = `
            SELECT 
                u.id, u.username, u.npm, u.role, u.fakultas, u.prodi, u.angkatan,
                u.denda,
                COALESCE((
                    SELECT SUM(l.fineAmount - IFNULL(l.finePaid,0))
                    FROM loans l 
                    WHERE l.user_id = u.id 
                      AND l.fineAmount > IFNULL(l.finePaid,0)
                      AND l.finePaymentStatus IN ('unpaid','awaiting_proof','pending_verification')
                ),0) AS active_unpaid_fine,
                (SELECT COUNT(*) FROM loans l2 WHERE l2.user_id = u.id AND l2.status IN ('Sedang Dipinjam', 'Menunggu Persetujuan', 'Terlambat', 'Siap Dikembalikan')) AS active_loans_count
            FROM users u
            ORDER BY u.id DESC
        `;
        const [users] = await pool.query(userQuery);

        // Query all active loans for all users
        const loanQuery = `
            SELECT l.id, l.user_id, l.book_id, l.expectedReturnDate, b.title as bookTitle
            FROM loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.status IN ('Sedang Dipinjam', 'Menunggu Persetujuan', 'Terlambat', 'Siap Dikembalikan')
        `;
        const [loans] = await pool.query(loanQuery);

        // Group loans by user_id
        const loansByUser = {};
        for (const loan of loans) {
            if (!loansByUser[loan.user_id]) loansByUser[loan.user_id] = [];
            loansByUser[loan.user_id].push({
                id: loan.id,
                bookTitle: loan.bookTitle,
                expectedReturnDate: loan.expectedReturnDate
            });
        }

        const usersWithLoans = users.map(user => ({
            ...user,
            dendaRupiah: formatRupiah(user.denda),
            activeUnpaidFineRupiah: formatRupiah(user.active_unpaid_fine),
            activeLoans: loansByUser[user.id] || []
        }));

        res.json(usersWithLoans);
    } catch (error) {
        console.error('❌ Error fetching all users:', error);
        res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
    }
};


// 2. Menambah Pengguna Baru (POST /api/admin/users)
exports.createUser = async (req, res) => {
    const pool = getDBPool(req);
    const { username, npm, password, role = 'user', fakultas, prodi, angkatan } = req.body;
    
    if (!username || !npm || !password) {
        return res.status(400).json({ message: 'Username, NPM, dan Password wajib diisi.' });
    }
    
    try {
        // Cek duplikasi NPM
        const [duplicate] = await pool.query('SELECT id FROM users WHERE npm = ?', [npm]);
        if (duplicate.length > 0) {
            return res.status(400).json({ message: 'NPM sudah terdaftar.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            'INSERT INTO users (username, npm, password, role, fakultas, prodi, angkatan, denda) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [username, npm, hashedPassword, role, fakultas || null, prodi || null, angkatan || null, 0]
        );

        res.status(201).json({ success: true, message: 'Pengguna baru berhasil ditambahkan.', userId: result.insertId });
    } catch (error) {
        console.error('❌ Error creating user:', error);
        res.status(500).json({ message: 'Gagal menambahkan pengguna.' });
    }
};

// 3. Memperbarui Pengguna (PUT /api/admin/users/:id)
exports.updateUser = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.params.id;
    const { username, npm, password, role, fakultas, prodi, angkatan, denda } = req.body;

    if (!username || !npm || !role) {
        return res.status(400).json({ message: 'Username, NPM, dan Role wajib diisi.' });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        // Cek duplikasi NPM (kecuali untuk user ini sendiri)
        const [duplicate] = await connection.query('SELECT id FROM users WHERE npm = ? AND id != ?', [npm, userId]);
        if (duplicate.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'NPM sudah digunakan oleh pengguna lain.' });
        }

        let updateQuery = 'UPDATE users SET username = ?, npm = ?, role = ?, fakultas = ?, prodi = ?, angkatan = ?, denda = ?';
        let params = [username, npm, role, fakultas || null, prodi || null, angkatan || null, denda, userId];
        
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            params.splice(params.length - 1, 0, hashedPassword); // Sisipkan password hash sebelum userId
        }
        
        updateQuery += ' WHERE id = ?';

        const [result] = await connection.query(updateQuery, params);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        await connection.commit();
        res.json({ success: true, message: 'Data pengguna berhasil diperbarui.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error updating user:', error);
        res.status(500).json({ message: 'Gagal memperbarui data pengguna.' });
    } finally {
        if (connection) connection.release();
    }
};

// 4. Menghapus Pengguna (DELETE /api/admin/users/:id)
exports.deleteUser = async (req, res) => {
    const pool = getDBPool(req);
    const userId = req.params.id;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Cek apakah user memiliki pinjaman aktif/tertunda
        const [activeLoans] = await connection.query(
            'SELECT COUNT(*) as count FROM loans WHERE user_id = ? AND status IN (?, ?, ?)', 
            [userId, 'Sedang Dipinjam', 'Menunggu Persetujuan', 'Siap Dikembalikan']
        );
        if (activeLoans[0].count > 0) {
            await connection.rollback();
            return res.status(400).json({ message: `Tidak dapat menghapus pengguna. Terdapat ${activeLoans[0].count} pinjaman yang masih aktif (Dipinjam/Tertunda/Siap Dikembalikan).` });
        }

        // Hapus data pengguna
        const [result] = await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        await connection.commit();
        res.json({ success: true, message: 'Pengguna berhasil dihapus.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('❌ Error deleting user:', error);
        res.status(500).json({ message: 'Gagal menghapus pengguna.' });
    } finally {
        if (connection) connection.release();
    }
};


// 5. Menerapkan Denda Manual (POST /api/admin/penalty/apply)
exports.applyPenalty = async (req, res) => {
    const pool = getDBPool(req);
    const { npm, amount } = req.body; 

    if (!npm || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: 'NPM dan jumlah denda yang valid (> 0) diperlukan.' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE users SET denda = denda + ?, denda_unpaid = denda_unpaid + ? WHERE npm = ?', 
            [amount, amount, npm]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pengguna dengan NPM tersebut tidak ditemukan.' });
        }

        res.json({ success: true, message: `Denda sebesar ${formatRupiah(amount)} berhasil diterapkan pada NPM ${npm}.` });
    } catch (error) {
        console.error('❌ Error applying penalty:', error);
        res.status(500).json({ message: 'Gagal menerapkan denda di database.' });
    }
};

// 6. Mereset Denda (Lunas) (POST /api/admin/penalty/reset/:id)
exports.resetPenalty = async (req, res) => {
    const pool = getDBPool(req);
    const { id } = req.params; // Menggunakan ID pengguna

    try {
        const [result] = await pool.query(
            'UPDATE users SET denda = 0 WHERE id = ?', 
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }
        
        res.json({ success: true, message: 'Denda pengguna berhasil direset (Lunas).' });
    } catch (error) {
        console.error('❌ Error resetting penalty:', error);
        res.status(500).json({ message: 'Gagal mereset denda.' });
    }
};

// 7. Get Pending Fine Payments (GET /api/admin/fine-payments)
exports.getPendingFinePayments = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const [rows] = await pool.query(`
            SELECT * FROM fine_payments 
            WHERE status = 'pending' 
            ORDER BY created_at DESC
        `);
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][FINE_PAYMENTS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data pembayaran denda.' });
    }
};

// 8. Verify Fine Payment (POST /api/admin/fine-payments/:id/verify)
exports.verifyFinePayment = async (req, res) => {
    const pool = getDBPool(req);
    const { id } = req.params;
    const { action, notes, proofUrl } = req.body; // action: 'approve' | 'reject', proofUrl for cash payment
    const adminId = req.user.id;
    
    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Action harus approve atau reject.' });
    }
    
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Get payment detail
        const [payments] = await connection.query('SELECT * FROM fine_payments WHERE id = ? LIMIT 1', [id]);
        if (!payments.length) {
            await connection.rollback();
            return res.status(404).json({ message: 'Pembayaran tidak ditemukan.' });
        }
        
        const payment = payments[0];
        
        if (action === 'approve') {
            // Update payment status
            let updateProof = proofUrl || payment.proof_url;
            
            await connection.query(
                'UPDATE fine_payments SET status = ?, verified_by = ?, verified_at = NOW(), admin_notes = ?, proof_url = ? WHERE id = ?',
                ['approved', adminId, notes || null, updateProof, id]
            );
            
            // Update loans - mark fines as paid
            const loanIds = JSON.parse(payment.loan_ids || '[]');
            if (loanIds.length > 0) {
                const placeholders = loanIds.map(() => '?').join(',');
                await connection.query(
                    `UPDATE loans SET finePaid = 1 WHERE id IN (${placeholders})`,
                    loanIds
                );
            }
            
            // Send notification to user
            const message = `Pembayaran denda sebesar ${formatRupiah(payment.amount_total)} telah diverifikasi dan disetujui. Denda Anda telah dilunasi.`;
            
            try {
                const io = req.app.get('io');
                if (io) {
                    io.to(`user_${payment.user_id}`).emit('notification', {
                        message,
                        type: 'success',
                        paymentId: id
                    });
                }
            } catch (err) {
                console.warn('[SOCKET.IO] Gagal kirim notifikasi:', err.message);
            }
            
            // Save to user_notifications
            await connection.query(
                `INSERT INTO user_notifications (user_id, kind, type, title, message, created_at) 
                 VALUES (?, 'user_notif', 'success', 'Pembayaran Denda Disetujui', ?, NOW())`,
                [payment.user_id, message]
            );
            
        } else {
            // Reject payment
            await connection.query(
                'UPDATE fine_payments SET status = ?, verified_by = ?, verified_at = NOW(), admin_notes = ? WHERE id = ?',
                ['rejected', adminId, notes || 'Pembayaran ditolak', id]
            );
            
            const message = `Pembayaran denda sebesar ${formatRupiah(payment.amount_total)} ditolak. ${notes ? `Alasan: ${notes}` : ''} Silakan hubungi admin untuk informasi lebih lanjut.`;
            
            try {
                const io = req.app.get('io');
                if (io) {
                    io.to(`user_${payment.user_id}`).emit('notification', {
                        message,
                        type: 'error',
                        paymentId: id
                    });
                }
            } catch (err) {
                console.warn('[SOCKET.IO] Gagal kirim notifikasi:', err.message);
            }
            
            // Save to user_notifications
            await connection.query(
                `INSERT INTO user_notifications (user_id, kind, type, title, message, created_at) 
                 VALUES (?, 'user_notif', 'error', 'Pembayaran Denda Ditolak', ?, NOW())`,
                [payment.user_id, message]
            );
        }
        
        await connection.commit();
        res.json({ success: true, message: `Pembayaran berhasil ${action === 'approve' ? 'disetujui' : 'ditolak'}.` });
    } catch (e) {
        if (connection) await connection.rollback();
        console.error('[ADMIN][VERIFY_FINE_PAYMENT] Error:', e);
        res.status(500).json({ message: 'Gagal memverifikasi pembayaran.' });
    } finally {
        if (connection) connection.release();
    }
};
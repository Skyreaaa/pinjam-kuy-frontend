const getDBPool = (req) => req.app.get('dbPool');

exports.getStats = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result1 = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
        const totalUsers = result1.rows[0]?.totalusers || 0;
        
        const result2 = await pool.query('SELECT COUNT(*) as totalBooks FROM books');
        const totalBooks = result2.rows[0]?.totalbooks || 0;
        
        const result3 = await pool.query('SELECT COUNT(*) as totalLoans FROM loans');
        const totalLoans = result3.rows[0]?.totalloans || 0;
        
        const result4 = await pool.query("SELECT COUNT(*) as totalReturns FROM loans WHERE status='Dikembalikan'");
        const totalReturns = result4.rows[0]?.totalreturns || 0;
        
        const result5 = await pool.query('SELECT SUM(fineAmount) as totalFines FROM loans WHERE fineAmount > 0');
        const totalFines = result5.rows[0]?.totalfines || 0;
        
        res.json({
            totalUsers,
            totalBooks,
            totalLoans,
            totalReturns,
            totalFines
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
        const { rows } = await pool.query(`
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
        const result1 = await pool.query(`
            SELECT TO_CHAR(createdAt, 'YYYY-MM') as month, COUNT(*) as loanCount
            FROM loans
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        const loans = result1.rows;
        const result2 = await pool.query(`
            SELECT TO_CHAR(updatedAt, 'YYYY-MM') as month, COUNT(*) as returnCount
            FROM loans
            WHERE status = 'Dikembalikan'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        const returns = result2.rows;
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
        const result1 = await pool.query(`
            SELECT COUNT(*) as activeLoans FROM loans WHERE status IN ('Sedang Dipinjam', 'Terlambat', 'Siap Dikembalikan')
        `);
        const activeLoans = result1.rows[0]?.activeloans || 0;
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
        const result1 = await pool.query(`
            SELECT SUM(fineAmount) as totalOutstandingFines FROM loans WHERE fineAmount > 0 AND (finePaid IS NULL OR finePaid = FALSE)
        `);
        const totalOutstandingFines = result1.rows[0]?.totaloutstandingfines || 0;
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
        const { rows } = await pool.query(`
            SELECT DATE(createdAt) as date, COUNT(*) as notifCount
            FROM user_notifications
            WHERE createdAt >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY date
            ORDER BY date DESC
        `);
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][NOTIF_STATS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil statistik notifikasi.' });
    }
};

// 6. Get Pending Fine Payments
exports.getPendingFinePayments = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result = await pool.query(`
            SELECT fp.*, u.username, u.npm 
            FROM fine_payments fp
            JOIN users u ON fp.user_id = u.id
            WHERE fp.status = 'pending'
            ORDER BY fp.created_at DESC
        `);
        res.json(result.rows || []);
    } catch (e) {
        console.error('[ADMIN][PENDING_FINE_PAYMENTS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data pembayaran denda pending.' });
    }
};
// Get all completed loan history (returned or rejected loans)
exports.getHistoryAll = async (req, res) => {
    const pool = getDBPool(req);
    try {
        const result = await pool.query(`
            SELECT 
                l.id,
                l.loanDate,
                l.expectedReturnDate,
                l.actualReturnDate,
                l.status,
                l.fineAmount,
                l.finePaid,
                l.returnProofUrl,
                l.returnProofMetadata,
                l.readyReturnDate,
                l.approvedAt,
                l.returnDecision,
                l.rejectionReason,
                l.createdAt,
                b.title,
                b.kodeBuku,
                b.author,
                u.username,
                u.npm,
                u.fakultas
            FROM loans l
            JOIN books b ON l.book_id = b.id
            JOIN users u ON l.user_id = u.id
            WHERE l.status IN ('Dikembalikan', 'Ditolak')
            ORDER BY l.actualReturnDate DESC NULLS LAST, l.approvedAt DESC NULLS LAST, l.loanDate DESC
        `);
        
        const rows = result.rows.map(row => ({
            ...row,
            fineAmountRupiah: row.fineamount ? `Rp ${Number(row.fineamount).toLocaleString('id-ID')}` : 'Rp 0',
            finePaidRupiah: row.finepaid ? `Rp ${Number(row.finepaid).toLocaleString('id-ID')}` : 'Rp 0'
        }));
        
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][HISTORY_ALL] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil riwayat aktivitas.' });
    }
};
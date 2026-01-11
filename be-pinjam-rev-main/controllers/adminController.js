const getDBPool = (req) => req.app.get('dbPool');

exports.getStats = async (req, res) => {
    const pool = getDBPool(req);
    try {
        // Total Users (excluding admin)
        const result1 = await pool.query("SELECT COUNT(*) as totalUsers FROM users WHERE role != 'admin'");
        const totalUsers = result1.rows[0]?.totalusers || 0;
        
        // Total Books
        const result2 = await pool.query('SELECT COUNT(*) as totalBooks FROM books');
        const totalBooks = result2.rows[0]?.totalbooks || 0;
        
        // Total Loans (all loans created)
        const result3 = await pool.query('SELECT COUNT(*) as totalLoans FROM loans');
        const totalLoans = result3.rows[0]?.totalloans || 0;
        
        // Total Returns (successfully returned books)
        const result4 = await pool.query("SELECT COUNT(*) as totalReturns FROM loans WHERE status='Dikembalikan'");
        const totalReturns = result4.rows[0]?.totalreturns || 0;
        
        // Total Fines (sum of all fines from loans + fine_payments table)
        const result5 = await pool.query(`
            SELECT 
                COALESCE(SUM(l.fineAmount), 0) as loanFines,
                COALESCE(SUM(fp.amount), 0) as paymentFines
            FROM loans l
            LEFT JOIN fine_payments fp ON fp.status = 'approved'
        `);
        const loanFines = parseFloat(result5.rows[0]?.loanfines) || 0;
        const paymentFines = parseFloat(result5.rows[0]?.paymentfines) || 0;
        const totalFines = loanFines; // Total denda yang dihasilkan dari loans
        
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
            LEFT JOIN loans l ON l.book_id = b.id AND l.status != 'Ditolak'
            GROUP BY b.id, b.title, b.author, b.category
            ORDER BY borrowCount DESC
            LIMIT 5
        `);
        res.json(rows.map(r => ({
            id: r.id,
            title: r.title,
            author: r.author,
            category: r.category,
            borrowCount: parseInt(r.borrowcount) || 0
        })));
    } catch (e) {
        console.error('[ADMIN][TOP_BOOKS] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil data buku teratas.' });
    }
};

// 2. Monthly Activity (Loans & Returns per Month)
exports.getMonthlyActivity = async (req, res) => {
    const pool = getDBPool(req);
    try {
        // Get loans by loanDate (when loan was created)
        const result1 = await pool.query(`
            SELECT TO_CHAR(loanDate, 'YYYY-MM') as month, COUNT(*) as loanCount
            FROM loans
            WHERE status != 'Ditolak'
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        const loans = result1.rows.map(r => ({
            month: r.month,
            loancount: parseInt(r.loancount) || 0
        }));
        
        // Get returns by actualReturnDate (when book was actually returned)
        const result2 = await pool.query(`
            SELECT TO_CHAR(actualReturnDate, 'YYYY-MM') as month, COUNT(*) as returnCount
            FROM loans
            WHERE status = 'Dikembalikan' AND actualReturnDate IS NOT NULL
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `);
        const returns = result2.rows.map(r => ({
            month: r.month,
            returncount: parseInt(r.returncount) || 0
        }));
        
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

// 4. Outstanding Fines Summary (denda yang belum lunas)
exports.getOutstandingFines = async (req, res) => {
    const pool = getDBPool(req);
    try {
        // Calculate outstanding fines: total fines - total paid
        const result = await pool.query(`
            SELECT 
                COALESCE(SUM(l.fineAmount), 0) as totalFines,
                COALESCE(SUM(CASE WHEN l.finePaid = TRUE THEN l.fineAmount ELSE 0 END), 0) as paidFines
            FROM loans l
            WHERE l.fineAmount > 0
        `);
        
        const totalFines = parseFloat(result.rows[0]?.totalfines) || 0;
        const paidFines = parseFloat(result.rows[0]?.paidfines) || 0;
        const totalOutstandingFines = totalFines - paidFines;
        
        res.json({ totalOutstandingFines: Math.max(0, totalOutstandingFines) });
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
            id: row.id,
            loanDate: row.loandate,
            expectedReturnDate: row.expectedreturndate,
            actualReturnDate: row.actualreturndate,
            status: row.status,
            fineAmount: row.fineamount || 0,
            finePaid: row.finepaid || 0,
            fineAmountRupiah: row.fineamount ? `Rp ${Number(row.fineamount).toLocaleString('id-ID')}` : 'Rp 0',
            finePaidRupiah: row.finepaid ? `Rp ${Number(row.finepaid).toLocaleString('id-ID')}` : 'Rp 0',
            returnProofUrl: row.returnproofurl,
            returnProofMetadata: row.returnproofmetadata,
            readyReturnDate: row.readyreturndate,
            approvedAt: row.approvedat,
            returnDecision: row.returndecision,
            rejectionReason: row.rejectionreason,
            createdAt: row.createdat,
            title: row.title,
            kodeBuku: row.kodebuku,
            author: row.author,
            username: row.username,
            npm: row.npm,
            fakultas: row.fakultas
        }));
        
        res.json(rows);
    } catch (e) {
        console.error('[ADMIN][HISTORY_ALL] Error:', e);
        res.status(500).json({ message: 'Gagal mengambil riwayat aktivitas.' });
    }
};
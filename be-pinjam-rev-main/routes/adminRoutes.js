require('dotenv').config();

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); 
const loanController = require('../controllers/loanController'); 
const jwt = require('jsonwebtoken'); 
router.get('/stats', adminController.getStats);
// Statistik/Laporan untuk dashboard admin
router.get('/stats', adminController.getStats);
router.get('/stats/top-books', adminController.getTopBooks);
router.get('/stats/monthly-activity', adminController.getMonthlyActivity);
router.get('/stats/active-loans', adminController.getActiveLoans);
router.get('/stats/outstanding-fines', adminController.getOutstandingFines);
router.get('/stats/notification-stats', adminController.getNotificationStats);

// === BROADCAST NOTIFIKASI KE SEMUA USER ===
const UserNotification = require('../models/user_notifications');
const pushController = require('../controllers/pushController');

// File: routes/adminRoutes.js (FULL CODE FIXED)

// --- Middleware Otentikasi Admin ---
const authenticateAdmin = (req, res, next) => {
    console.log('🔐 [authenticateAdmin] Checking route:', req.method, req.path);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('❌ [authenticateAdmin] No Authorization header');
        return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' });
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET wajib di-set di .env!'); }
    const JWT_SECRET = process.env.JWT_SECRET;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ [authenticateAdmin] Invalid token:', err.message);
            return res.status(401).json({ message: 'Token tidak valid atau kadaluarsa.' });
        }
        
        if (decoded.role !== 'admin') {
            console.log('❌ [authenticateAdmin] Not admin role:', decoded.role);
            return res.status(403).json({ message: 'Akses Ditolak. Anda bukan Admin.' });
        }
        
        console.log('✅ [authenticateAdmin] Admin authenticated:', decoded.username);
        req.user = decoded; 
        next();
    });
};

router.use(authenticateAdmin);

// Broadcast route (harus setelah authenticateAdmin)
router.post('/broadcast', async (req, res) => {
    console.log('📢 [BROADCAST] Received request:', req.body);
    const { message, type = 'info', userIds } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Pesan broadcast tidak boleh kosong.' });
    }
    try {
        const io = req.app.get('io');
        console.log('📢 [BROADCAST] IO available:', !!io);
        
        // Jika ada userIds, kirim ke user tertentu saja
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            console.log(`📢 [BROADCAST] Sending to ${userIds.length} specific users`);
            // Simpan notifikasi untuk setiap user
            for (const userId of userIds) {
                await UserNotification.create({ user_id: userId, type, message, is_broadcast: 0 });
                // Socket.IO ke user tertentu
                if (io) {
                    io.to(`user_${userId}`).emit('notification', {
                        message,
                        type,
                        is_broadcast: false,
                    });
                }
                // Push notification ke user tertentu
                try {
                    await pushController.sendPushNotification(userId, 'user', {
                        title: 'Pemberitahuan',
                        message: message,
                        tag: 'notification',
                        data: { type, is_broadcast: false },
                        requireInteraction: type === 'warning' || type === 'error'
                    });
                } catch (pushErr) {
                    console.warn(`[PUSH] Gagal kirim ke user ${userId}:`, pushErr.message);
                }
            }
            console.log(`✅ Broadcast berhasil dikirim ke ${userIds.length} user`);
        } else {
            // Broadcast ke semua user
            await UserNotification.create({ user_id: null, type, message, is_broadcast: 1 });
            
            // Kirim Socket.IO notification
            if (io) {
                io.emit('broadcast-notification', {
                    title: 'Pemberitahuan',
                    message,
                    type,
                    timestamp: new Date().toISOString()
                });
                console.log('✅ Socket.IO broadcast emitted (instant notification!)');
            }
        }
        
        return res.json({ success: true });
    } catch (err) {
        console.error('[ADMIN][BROADCAST] Error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengirim broadcast.' });
    }
});


// Approval pinjaman dinonaktifkan
// router.get('/loans/pending', loanController.getPendingLoans); 
router.get('/loans/pending', (req, res) => res.status(403).json({ message: 'Approval pinjaman dinonaktifkan.' }));
// =========================================================
//                       KELOLA PENGGUNA (Menggunakan adminController)
// =========================================================
router.get('/users', adminController.getAllUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);


// =========================================================
//                       KELOLA DENDA (Menggunakan adminController)
// =========================================================
// Menambah Denda Manual
router.post('/penalty/apply', adminController.applyPenalty);
// Mereset Denda (Lunas)
router.post('/penalty/reset/:id', adminController.resetPenalty); 

// =========================================================
//              VERIFIKASI PEMBAYARAN DENDA (Baru)
// =========================================================
// List pembayaran denda yang menunggu verifikasi
router.get('/fines/pending', async (req,res)=>{
    const pool = req.app.get('dbPool');
    try {
        // Pastikan tabel ada (jika belum dibuat oleh upload proof pertama)
        await pool.query(`CREATE TABLE IF NOT EXISTS fine_payment_notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            loan_ids TEXT NOT NULL,
            amount_total INT NOT NULL DEFAULT 0,
            method VARCHAR(30) NULL,
            proof_url VARCHAR(255) NULL,
            status ENUM('pending_verification','paid','rejected') NOT NULL DEFAULT 'pending_verification',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
        const [rows] = await pool.query(`SELECT n.*, u.username, u.npm FROM fine_payment_notifications n JOIN users u ON n.user_id=u.id WHERE n.status='pending_verification' ORDER BY n.created_at DESC`);
        res.json({ success:true, items: rows });
    } catch (e){
        console.error('[ADMIN][FINES][PENDING] Error:', e); res.status(500).json({ success:false, message:'Gagal mengambil daftar pembayaran denda menunggu verifikasi.' });
    }
});

// Verifikasi / Tolak pembayaran denda
router.post('/fines/verify', async (req,res)=>{
    const pool = req.app.get('dbPool');
    const { notificationId, action } = req.body || {};
    if(!notificationId || !['approve','reject'].includes(action)) return res.status(400).json({ success:false, message:'notificationId & action (approve|reject) diperlukan.' });
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();
        const [notiRows] = await conn.query('SELECT * FROM fine_payment_notifications WHERE id=? FOR UPDATE',[notificationId]);
        if(!notiRows.length) { await conn.rollback(); return res.status(404).json({ success:false, message:'Notifikasi tidak ditemukan.' }); }
        const noti = notiRows[0];
        if(noti.status !== 'pending_verification'){ await conn.rollback(); return res.status(400).json({ success:false, message:'Status sudah diverifikasi.' }); }
        const loanIds = JSON.parse(noti.loan_ids || '[]');
        if(action==='approve'){
            if(loanIds.length){
                const placeholders = loanIds.map(()=>'?').join(',');
                await conn.query(`UPDATE loans SET finePaid=1, finePaymentStatus='paid', finePaymentAt=NOW() WHERE id IN (${placeholders}) AND user_id=?`, [...loanIds, noti.user_id]);
                // Kurangi denda_unpaid user
                await conn.query(`UPDATE users SET denda_unpaid = GREATEST(denda_unpaid - ?,0) WHERE id=?`, [noti.amount_total, noti.user_id]);
            }
            await conn.query('UPDATE fine_payment_notifications SET status="paid" WHERE id=?',[notificationId]);
        } else if(action==='reject') {
            // Kembalikan status loans ke awaiting_proof agar user bisa upload ulang
            if(loanIds.length){
                const placeholders = loanIds.map(()=>'?').join(',');
                await conn.query(`UPDATE loans SET finePaymentStatus='awaiting_proof', finePaymentProof=NULL WHERE id IN (${placeholders}) AND user_id=?`, [...loanIds, noti.user_id]);
            }
            await conn.query('UPDATE fine_payment_notifications SET status="rejected" WHERE id=?',[notificationId]);
        }
        await conn.commit();

        // === SOCKET.IO NOTIFIKASI USER ===
        try {
            const io = req.app.get('io');
            if (io && noti.user_id) {
                if (action === 'approve') {
                    io.to(`user_${noti.user_id}`).emit('notification', {
                        message: `Pembayaran denda sebesar Rp${noti.amount_total} telah diverifikasi dan dinyatakan lunas. Terima kasih!`,
                        type: 'success',
                    });
                } else if (action === 'reject') {
                    io.to(`user_${noti.user_id}`).emit('notification', {
                        message: `Pembayaran denda ditolak. Silakan upload ulang bukti pembayaran yang valid.`,
                        type: 'error',
                    });
                }
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif pembayaran denda:', err.message);
        }

        res.json({ success:true, updated: notificationId, action });
    } catch (e){
        if(conn) await conn.rollback();
        console.error('[ADMIN][FINES][VERIFY] Error:', e); res.status(500).json({ success:false, message:'Gagal memverifikasi pembayaran denda.' });
    } finally { if(conn) conn.release(); }
});


// =========================================================
//                   KELOLA PINJAMAN & PENGEMBALIAN (Menggunakan loanController)
// =========================================================

// Daftar Pinjaman Tertunda
router.get('/loans/pending', loanController.getPendingLoans); 
// Daftar Pengembalian yang Sedang Dipinjam/Terlambat/Siap Dikembalikan
router.get('/returns/review', (req, res, next) => {
    console.log('🎯 [Route] /returns/review hit');
    next();
}, loanController.getReturnsForReview);
// Riwayat Pengembalian & Persetujuan (Dikembalikan, Ditolak)
router.get('/history', loanController.getHistory);

// Get active loans (Diambil, Sedang Dipinjam, Terlambat)
router.get('/loans/active', loanController.getActiveLoans);
// Send reminder to user
router.post('/loans/send-reminder', loanController.sendLoanReminder);

// Aksi Pinjaman: POST /api/admin/loans/approve (body: {loanId, expectedReturnDate})
router.post('/loans/approve', loanController.approveLoan);
router.post('/loans/scan', loanController.scanLoan); // body: { kodePinjam }
router.post('/loans/start', loanController.startLoan); // body: { loanId }
// Approval pinjaman dinonaktifkan
// router.post('/loans/approve', loanController.approveLoan);
router.post('/loans/approve', (req, res) => res.status(403).json({ message: 'Approval pinjaman dinonaktifkan.' }));
// Aksi Pinjaman: POST /api/admin/loans/reject (body: {loanId})
router.post('/loans/reject', loanController.rejectLoan);

// Aksi Pengembalian: POST /api/admin/returns/process (body: {loanId, fineAmount})
router.post('/returns/process', loanController.processReturn);
// Aksi Pengembalian: POST /api/admin/returns/reject (body: {loanId})
router.post('/returns/reject', loanController.rejectReturnProof);

// === FINE PAYMENTS ===
router.get('/fine-payments', adminController.getPendingFinePayments);
const { uploadFineProof } = require('../middleware/upload');
router.post('/fine-payments/:id/verify', uploadFineProof.single('proof'), adminController.verifyFinePayment);

module.exports = router;
require('dotenv').config();

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController'); 
const loanController = require('../controllers/loanController'); 
const jwt = require('jsonwebtoken'); 
// Statistik/Laporan untuk dashboard admin
router.get('/stats', adminController.getStats);
router.get('/stats/top-books', adminController.getTopBooks);
router.get('/stats/monthly-activity', adminController.getMonthlyActivity);
router.get('/stats/active-loans', adminController.getActiveLoans);
router.get('/stats/outstanding-fines', adminController.getOutstandingFines);
router.get('/stats/notification-stats', adminController.getNotificationStats);

// Alias routes without /stats prefix for frontend compatibility
router.get('/top-books', adminController.getTopBooks);
router.get('/monthly-activity', adminController.getMonthlyActivity);
router.get('/active-loans', adminController.getActiveLoans);
router.get('/outstanding-fines', adminController.getOutstandingFines);
router.get('/notification-stats', adminController.getNotificationStats);
router.get('/history-all', adminController.getHistoryAll);

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

// === USER MANAGEMENT ===
router.get('/users', async (req, res) => {
    const pool = req.app.get('dbPool');
    try {
        const result = await pool.query('SELECT id, npm, username, role, fakultas, prodi, angkatan, denda, denda_unpaid, active_loans_count, createdAt FROM users ORDER BY createdAt DESC');
        res.json(result.rows || []);
    } catch (error) {
        console.error('[ADMIN] Error getting users:', error);
        res.status(500).json({ message: 'Gagal mengambil daftar users' });
    }
});

router.post('/users', async (req, res) => {
    const pool = req.app.get('dbPool');
    const { npm, username, password, role = 'user', fakultas, prodi, angkatan } = req.body;
    try {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (npm, username, password, role, fakultas, prodi, angkatan) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [npm, username, hashedPassword, role, fakultas || null, prodi || null, angkatan || null]
        );
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('[ADMIN] Error creating user:', error);
        res.status(500).json({ message: 'Gagal membuat user' });
    }
});

router.put('/users/:id', async (req, res) => {
    const pool = req.app.get('dbPool');
    const { id } = req.params;
    const { npm, username, role, fakultas, prodi, angkatan, password } = req.body;
    
    console.log('[ADMIN] PUT /users/:id - Request data:', { id, npm, username, role, fakultas, prodi, angkatan, passwordProvided: !!password });
    console.log('[ADMIN] Raw password field:', password);
    
    try {
        let query, params;
        
        if (password && password.trim() !== '') {
            // Update dengan password baru
            console.log('[ADMIN] Updating user WITH new password, length:', password.length);
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);
            console.log('[ADMIN] Password hashed successfully, hash length:', hashedPassword.length);
            
            query = 'UPDATE users SET npm = $1, username = $2, role = $3, fakultas = $4, prodi = $5, angkatan = $6, password = $7 WHERE id = $8 RETURNING id, npm, username, role, fakultas, prodi, angkatan';
            params = [npm, username, role, fakultas || null, prodi || null, angkatan || null, hashedPassword, id];
        } else {
            // Update tanpa mengubah password
            console.log('[ADMIN] Updating user WITHOUT changing password');
            query = 'UPDATE users SET npm = $1, username = $2, role = $3, fakultas = $4, prodi = $5, angkatan = $6 WHERE id = $7 RETURNING id, npm, username, role, fakultas, prodi, angkatan';
            params = [npm, username, role, fakultas || null, prodi || null, angkatan || null, id];
        }
        
        console.log('[ADMIN] Executing query:', query);
        console.log('[ADMIN] Query params (password masked):', [npm, username, role, fakultas || null, prodi || null, angkatan || null, password ? '[PASSWORD HASH]' : null, id].filter(p => p !== null));
        
        const result = await pool.query(query, params);
        
        if (result.rows.length === 0) {
            console.log('[ADMIN] No user found with ID:', id);
            return res.status(404).json({ message: 'User tidak ditemukan' });
        }
        
        console.log('[ADMIN] Update successful, returning user:', result.rows[0]);
        res.json({ success: true, user: result.rows[0] });
    } catch (error) {
        console.error('[ADMIN] Error updating user:', error);
        res.status(500).json({ message: 'Gagal update user: ' + error.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    const pool = req.app.get('dbPool');
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('[ADMIN] Error deleting user:', error);
        res.status(500).json({ message: 'Gagal menghapus user' });
    }
});

// DEBUG endpoint untuk test password
router.post('/test-password', async (req, res) => {
    const { userId, testPassword } = req.body;
    const pool = req.app.get('dbPool');
    
    try {
        const user = await pool.query('SELECT id, npm, password FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) {
            return res.json({ success: false, message: 'User tidak ditemukan' });
        }
        
        const bcrypt = require('bcrypt');
        const isMatch = await bcrypt.compare(testPassword, user.rows[0].password);
        
        res.json({ 
            success: true, 
            userId: user.rows[0].id,
            npm: user.rows[0].npm,
            passwordMatch: isMatch,
            storedPasswordHash: user.rows[0].password
        });
    } catch (error) {
        console.error('[ADMIN] Error testing password:', error);
        res.status(500).json({ message: 'Error testing password' });
    }
});

// Get broadcast history
router.get('/broadcast/history', async (req, res) => {
    console.log('📊 [BROADCAST] Get history request');
    const pool = req.app.get('dbPool');
    try {
        const result = await pool.query(
            `SELECT id, user_id, type, message, is_broadcast, createdat as "createdAt"
             FROM user_notifications 
             WHERE is_broadcast = true 
             ORDER BY createdat DESC 
             LIMIT 50`
        );
        console.log(`✅ [BROADCAST] Found ${result.rows.length} broadcast messages`);
        res.json({ success: true, items: result.rows });
    } catch (err) {
        console.error('[ADMIN][BROADCAST][HISTORY] Error:', err);
        res.status(500).json({ success: false, message: 'Gagal mengambil riwayat broadcast: ' + err.message });
    }
});

// Broadcast route (harus setelah authenticateAdmin)
router.post('/broadcast', async (req, res) => {
    console.log('📢 [BROADCAST] Received request:', req.body);
    const { message, type = 'info', userIds } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Pesan broadcast tidak boleh kosong.' });
    }
    try {
        const pool = req.app.get('dbPool');
        const io = req.app.get('io');
        console.log('📢 [BROADCAST] IO available:', !!io);
        
        // Jika ada userIds, kirim ke user tertentu saja
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            console.log(`📢 [BROADCAST] Sending to ${userIds.length} specific users`);
            // Simpan notifikasi untuk setiap user
            for (const userId of userIds) {
                try {
                    await pool.query(
                        'INSERT INTO user_notifications (user_id, type, message, is_broadcast) VALUES ($1, $2, $3, $4)',
                        [userId, type, message, false]
                    );
                    // Socket.IO ke user tertentu
                    if (io) {
                        io.to(`user_${userId}`).emit('notification', {
                            message,
                            type,
                            is_broadcast: false,
                        });
                    }
                } catch (notifErr) {
                    console.warn(`[BROADCAST] Error saving notification for user ${userId}:`, notifErr.message);
                }
            }
            console.log(`✅ Broadcast berhasil dikirim ke ${userIds.length} user`);
            return res.json({ success: true, message: `Broadcast berhasil dikirim ke ${userIds.length} user` });
        } else {
            // Broadcast ke semua user
            await pool.query(
                'INSERT INTO user_notifications (user_id, type, message, is_broadcast) VALUES ($1, $2, $3, $4)',
                [null, type, message, true]
            );
            
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
            console.log('✅ Broadcast berhasil dikirim ke semua user');
            return res.json({ success: true, message: 'Broadcast berhasil dikirim ke semua user' });
        }
    } catch (err) {
        console.error('[ADMIN][BROADCAST] Error:', err);
        return res.status(500).json({ success: false, message: 'Gagal mengirim broadcast: ' + err.message });
    }
});


// =========================================================
//                       KELOLA PENGGUNA
// =========================================================
// Users routes already defined at the top (lines 63-106)

// =========================================================
//                       KELOLA DENDA - TEMPORARILY DISABLED
// =========================================================
// TODO: Implement penalty functions
// // TODO: router.post('/penalty/apply', adminController.applyPenalty);
// // TODO: router.post('/penalty/reset/:id', adminController.resetPenalty); 

// =========================================================
//              VERIFIKASI PEMBAYARAN DENDA (Baru)
// =========================================================
// List pembayaran denda yang menunggu verifikasi
router.get('/fines/pending', async (req,res)=>{
    const pool = req.app.get('dbPool');
    try {
        // Pastikan tabel ada (jika belum dibuat oleh upload proof pertama)
        await pool.query(`CREATE TABLE IF NOT EXISTS fine_payment_notifications (
            id SERIAL PRIMARY KEY,
            user_id INT NOT NULL,
            loan_ids TEXT NOT NULL,
            amount_total INT NOT NULL DEFAULT 0,
            method VARCHAR(30) NULL,
            proof_url VARCHAR(255) NULL,
            status VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`);
        const result = await pool.query(`SELECT n.*, u.username, u.npm FROM fine_payment_notifications n JOIN users u ON n.user_id=u.id WHERE n.status='pending_verification' ORDER BY n.created_at DESC`);
        res.json({ success:true, items: result.rows || [] });
    } catch (e){
        console.error('[ADMIN][FINES][PENDING] Error:', e); res.status(500).json({ success:false, message:'Gagal mengambil daftar pembayaran denda menunggu verifikasi.' });
    }
});

// Verifikasi / Tolak pembayaran denda
router.post('/fines/verify', async (req,res)=>{
    const pool = req.app.get('dbPool');
    const { notificationId, action } = req.body || {};
    if(!notificationId || !['approve','reject'].includes(action)) return res.status(400).json({ success:false, message:'notificationId & action (approve|reject) diperlukan.' });
    try {
        // PostgreSQL uses pool directly, no transactions for now
        const notiResult = await pool.query('SELECT * FROM fine_payment_notifications WHERE id=$1',[notificationId]);
        if(!notiResult.rows.length) { return res.status(404).json({ success:false, message:'Notifikasi tidak ditemukan.' }); }
        const noti = notiResult.rows[0];
        if(noti.status !== 'pending_verification'){ return res.status(400).json({ success:false, message:'Status sudah diverifikasi.' }); }
        const loanIds = JSON.parse(noti.loan_ids || '[]');
        if(action==='approve'){
            if(loanIds.length){
                const placeholders = loanIds.map((_, i)=>`$${i+1}`).join(',');
                await pool.query(`UPDATE loans SET finePaid=1, finePaymentStatus='paid', finePaymentAt=CURRENT_TIMESTAMP WHERE id IN (${placeholders}) AND user_id=$${loanIds.length+1}`, [...loanIds, noti.user_id]);
                // Kurangi denda_unpaid user
                await pool.query(`UPDATE users SET denda_unpaid = GREATEST(denda_unpaid - $1, 0) WHERE id=$2`, [noti.amount_total, noti.user_id]);
            }
            await pool.query('UPDATE fine_payment_notifications SET status=$1 WHERE id=$2',['paid', notificationId]);
        } else if(action==='reject') {
            // Kembalikan status loans ke awaiting_proof agar user bisa upload ulang
            if(loanIds.length){
                const placeholders = loanIds.map((_, i)=>`$${i+1}`).join(',');
                await pool.query(`UPDATE loans SET finePaymentStatus='awaiting_proof', finePaymentProof=NULL WHERE id IN (${placeholders}) AND user_id=$${loanIds.length+1}`, [...loanIds, noti.user_id]);
            }
            await pool.query('UPDATE fine_payment_notifications SET status=$1 WHERE id=$2',['rejected', notificationId]);
        }

        // === SOCKET.IO NOTIFIKASI USER + INSERT KE DB ===
        try {
            const io = req.app.get('io');
            if (noti.user_id) {
                if (action === 'approve') {
                    const message = `Pembayaran denda sebesar Rp${noti.amount_total} telah diverifikasi dan dinyatakan lunas. Terima kasih!`;
                    // Insert ke user_notifications
                    await UserNotification.create({
                        user_id: noti.user_id,
                        type: 'success',
                        message: message,
                        is_broadcast: 0
                    });
                    // Socket.IO
                    if (io) {
                        io.to(`user_${noti.user_id}`).emit('notification', {
                            message: message,
                            type: 'success',
                        });
                    }
                } else if (action === 'reject') {
                    const message = `Pembayaran denda ditolak. Silakan upload ulang bukti pembayaran yang valid.`;
                    // Insert ke user_notifications
                    await UserNotification.create({
                        user_id: noti.user_id,
                        type: 'error',
                        message: message,
                        is_broadcast: 0
                    });
                    // Socket.IO
                    if (io) {
                        io.to(`user_${noti.user_id}`).emit('notification', {
                            message: message,
                            type: 'error',
                        });
                    }
                }
            }
        } catch (err) {
            console.warn('[SOCKET.IO][NOTIF] Gagal kirim notif pembayaran denda:', err.message);
        }

        res.json({ success:true, updated: notificationId, action });
    } catch (e){
        console.error('[ADMIN][FINES][VERIFY] Error:', e); res.status(500).json({ success:false, message:'Gagal memverifikasi pembayaran denda.' });
    }
});


// =========================================================
//                   KELOLA PINJAMAN & PENGEMBALIAN (Menggunakan loanController)
// =========================================================

// Get active loans (Diambil, Sedang Dipinjam, Terlambat)
router.get('/loans/active', loanController.getActiveLoansList);
// Daftar Pengembalian yang Sedang Dipinjam/Terlambat/Siap Dikembalikan
router.get('/returns/review', (req, res, next) => {
    console.log('🎯 [Route] /admin/returns/review hit');
    next();
}, loanController.getReturnsForReview);
// Riwayat Pengembalian & Persetujuan (Dikembalikan, Ditolak)
router.get('/history', loanController.getHistory);

// Send reminder to user
router.post('/loans/send-reminder', loanController.sendLoanReminder);

// Aksi Pinjaman: POST /api/admin/loans/scan (body: { kodePinjam })
router.post('/loans/scan', loanController.scanLoan);
// Aksi Pinjaman: POST /api/admin/loans/start (body: { loanId })
router.post('/loans/start', loanController.startLoan);
// Approval pinjaman dinonaktifkan
router.post('/loans/approve', (req, res) => res.status(403).json({ message: 'Approval pinjaman dinonaktifkan.' }));
// Aksi Pinjaman: POST /api/admin/loans/reject (body: {loanId})
router.post('/loans/reject', loanController.rejectLoan);

// Aksi Pengembalian: POST /api/admin/returns/process (body: {loanId, fineAmount})
router.post('/returns/process', loanController.processReturn);
// Aksi Pengembalian: POST /api/admin/returns/reject (body: {loanId}) - with optional file upload
const { uploadAdminRejection } = require('../middleware/upload');
router.post('/returns/reject', uploadAdminRejection.single('adminProof'), loanController.rejectReturnProof);

// === FINE PAYMENTS ===
router.get('/fine-payments', loanController.getAllFinePayments);
router.post('/fine-payments/:id/verify', loanController.verifyFinePayment);

// === RESET FINES ===
router.post('/reset-fines/:userId', async (req, res) => {
    const pool = req.app.get('dbPool');
    const userId = parseInt(req.params.userId);
    
    try {
        // Reset all fines for user
        await pool.query(
            `UPDATE users SET denda = 0, denda_unpaid = 0 WHERE id = $1`,
            [userId]
        );
        
        // Mark all loans as paid
        await pool.query(
            `UPDATE loans SET finepaid = true WHERE user_id = $1 AND finepaid = false`,
            [userId]
        );
        
        console.log(`✅ [resetFines] Reset all fines for user ${userId}`);
        res.json({ success: true, message: 'Denda berhasil direset.' });
    } catch (e) {
        console.error('❌ [resetFines] Error:', e);
        res.status(500).json({ success: false, message: 'Gagal reset denda.' });
    }
});

module.exports = router;

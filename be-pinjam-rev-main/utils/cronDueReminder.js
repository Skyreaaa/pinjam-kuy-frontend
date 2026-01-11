// cronDueReminder.js
// Kirim notifikasi jatuh tempo ke user sehari sebelum dan saat jatuh tempo

const { format, addDays, isSameDay } = require('date-fns');
const pushController = require('../controllers/pushController');

async function sendDueReminders(app) {
    const dbPool = app.get('dbPool');
    const io = app.get('io');
    if (!dbPool || !io) return;
    const today = new Date();
    const tomorrow = addDays(today, 1);
    try {
        // Ambil semua pinjaman aktif yang belum dikembalikan
        const [rows] = await dbPool.query(`
            SELECT l.id, l.user_id, l.expectedReturnDate, b.title
            FROM loans l
            JOIN books b ON l.book_id = b.id
            WHERE l.status IN ('Sedang Dipinjam', 'Terlambat')
        `);
        
        let remindersSent = 0;
        
        for (const loan of rows) {
            if (!loan.expectedReturnDate) continue;
            const dueDate = new Date(loan.expectedReturnDate);
            let message = '';
            let shouldSend = false;
            
            // Reminder H-1
            if (isSameDay(dueDate, tomorrow)) {
                message = `Pengingat: Besok adalah batas pengembalian buku "${loan.title}". Segera kembalikan agar tidak kena denda!`;
                shouldSend = true;
            }
            // Reminder hari H
            else if (isSameDay(dueDate, today)) {
                message = `Hari ini adalah batas akhir pengembalian buku "${loan.title}". Kembalikan hari ini untuk menghindari denda!`;
                shouldSend = true;
            }
            
            if (shouldSend) {
                // Socket.IO notification
                io.to(`user_${loan.user_id}`).emit('notification', {
                    message,
                    type: 'warning',
                });
                
                // --- SAVE TO DATABASE for notification history ---
                try {
                    await dbPool.query(
                        'INSERT INTO user_notifications (user_id, message, type, is_broadcast) VALUES ($1, $2, $3, $4)',
                        [loan.user_id, message, 'warning', false]
                    );
                    console.log(`✅ [CRON][DUE REMINDER] Database notification saved for user ${loan.user_id}`);
                } catch (dbErr) {
                    console.warn(`[CRON][DUE REMINDER] Failed to save DB notification for user ${loan.user_id}:`, dbErr.message);
                }
                
                // Push notification
                try {
                    await pushController.sendPushNotification(loan.user_id, 'user', {
                        title: 'Reminder H-1 Pengembalian',
                        message: message,
                        tag: 'due-reminder',
                        data: { loanId: loan.id, type: 'due_reminder' },
                        requireInteraction: true
                    });
                    remindersSent++;
                } catch (pushErr) {
                    console.warn(`[PUSH][CRON] Gagal kirim push ke user ${loan.user_id}:`, pushErr.message);
                }
            }
        }
        
        if (remindersSent > 0) {
            console.log(`✅ [CRON][DUE REMINDER] Berhasil kirim ${remindersSent} push notifications`);
        }
    } catch (err) {
        console.error('[CRON][DUE REMINDER] Error:', err);
    }
}

module.exports = { sendDueReminders };
// Web-push tidak digunakan lagi, diganti dengan Socket.IO real-time notifications
// const webpush = require('web-push');

// VAPID keys configuration
// Generate your own keys by running: npx web-push generate-vapid-keys
// const vapidKeys = {
//   publicKey: process.env.VAPID_PUBLIC_KEY || 'BGhFvr-14LSm6KqdJlcEZkBJ9DgPEjUoMG8i5cAbAw2wjnoOgqajf_8qUx0ibxd6hACUhySSoh-cxLPAUfY9Tfw',
//   privateKey: process.env.VAPID_PRIVATE_KEY || 'mz2Wxkkg97Op5yYdDvXIhE6ET-ttnGVBjoqhERkpY4o'
// };

// Configure web-push
// webpush.setVapidDetails(
//   'mailto:admin@pinjamkuy.com',
//   vapidKeys.publicKey,
//   vapidKeys.privateKey
// );

// Store subscriptions in database
// You can store this in MySQL push_subscriptions table
const subscriptions = new Map();

/**
 * Subscribe user to push notifications
 */
exports.subscribe = async (req, res) => {
  try {
    const { userId, role, subscription } = req.body;

    console.log('📥 [PUSH] Subscribe request:', { userId, role, hasSubscription: !!subscription });

    if (!userId || !subscription) {
      return res.status(400).json({ message: 'userId dan subscription diperlukan' });
    }

    // In production, save to MySQL database
    // For now, store in memory
    const key = `${role}_${userId}`;
    subscriptions.set(key, subscription);

    console.log('✅ Push subscription saved:', key);
    console.log('📊 Total subscriptions:', subscriptions.size);

    res.json({ 
      success: true, 
      message: 'Notifikasi push berhasil diaktifkan' 
    });
  } catch (error) {
    console.error('❌ Subscribe error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menyimpan subscription' 
    });
  }
};

/**
 * Unsubscribe user from push notifications
 */
exports.unsubscribe = async (req, res) => {
  try {
    const { userId, role } = req.body;

    const key = `${role}_${userId}`;
    subscriptions.delete(key);

    console.log('✅ Push subscription removed:', key);

    res.json({ 
      success: true, 
      message: 'Notifikasi push berhasil dinonaktifkan' 
    });
  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal menghapus subscription' 
    });
  }
};

/**
 * Send push notification to specific user
 */
exports.sendPushNotification = async (userId, role, payload) => {
  try {
    const key = `${role}_${userId}`;
    const subscription = subscriptions.get(key);

    if (!subscription) {
      console.log(`⚠️ No push subscription found for ${key}`);
      return { success: false, message: 'No subscription found' };
    }

    const notificationPayload = JSON.stringify({
      title: payload.title || 'Pemberitahuan',
      body: payload.message || payload.body || '',
      icon: '/Logo-nobg.png',
      badge: '/Logo-nobg.png',
      tag: payload.tag || 'pinjam-kuy-notification',
      data: payload.data || {},
      requireInteraction: payload.requireInteraction || false
    });

    await webpush.sendNotification(subscription, notificationPayload);
    
    console.log(`✅ Push notification sent to ${key}:`, payload.title);
    return { success: true, message: 'Notification sent' };
  } catch (error) {
    console.error('❌ Send push error:', error);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410) {
      const key = `${role}_${userId}`;
      subscriptions.delete(key);
      console.log(`🗑️ Removed invalid subscription: ${key}`);
    }
    
    return { success: false, message: error.message };
  }
};

/**
 * Send push notification to all admins
 */
exports.sendPushToAdmins = async (payload) => {
  const results = [];
  
  // In production, query database for all admin subscriptions
  for (const [key, subscription] of subscriptions.entries()) {
    if (key.startsWith('admin_')) {
      const userId = parseInt(key.split('_')[1]);
      const result = await exports.sendPushNotification(userId, 'admin', payload);
      results.push({ userId, ...result });
    }
  }

  console.log(`✅ Sent push to ${results.length} admins`);
  return results;
};

/**
 * Send push notification to all users
 */
exports.sendPushToAllUsers = async (payload) => {
  console.log('📤 [PUSH] Sending to all users, total subscriptions:', subscriptions.size);
  const results = [];
  
  for (const [key, subscription] of subscriptions.entries()) {
    console.log('📤 [PUSH] Checking subscription key:', key);
    if (key.startsWith('user_')) {
      const userId = parseInt(key.split('_')[1]);
      console.log(`📤 [PUSH] Sending to user ${userId}`);
      const result = await exports.sendPushNotification(userId, 'user', payload);
      results.push({ userId, ...result });
    }
  }

  console.log(`✅ Sent push to ${results.length} users. Success: ${results.filter(r => r.success).length}, Failed: ${results.filter(r => !r.success).length}`);
  return results;
};

// Export VAPID public key for frontend
exports.getVapidPublicKey = (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
};

/**
 * Admin broadcast notification to all users
 */
exports.adminBroadcast = async (req, res) => {
  try {
    const { title, message, target } = req.body;

    if (!title || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title dan message diperlukan' 
      });
    }

    const payload = {
      title,
      message,
      body: message,
      data: {
        url: '/home',
        type: 'broadcast'
      }
    };

    let results = [];

    if (target === 'all' || target === 'users') {
      const userResults = await exports.sendPushToAllUsers(payload);
      results = results.concat(userResults);
    }

    if (target === 'all' || target === 'admins') {
      const adminResults = await exports.sendPushToAdmins(payload);
      results = results.concat(adminResults);
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    res.json({
      success: true,
      message: `Broadcast berhasil dikirim ke ${successCount} dari ${totalCount} penerima`,
      stats: {
        total: totalCount,
        success: successCount,
        failed: totalCount - successCount
      }
    });
  } catch (error) {
    console.error('❌ Admin broadcast error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Gagal mengirim broadcast notification',
      error: error.message 
    });
  }
};

/**
 * Get subscriptions count (for admin dashboard)
 */
exports.getSubscriptionsCount = (req, res) => {
  const userSubscriptions = Array.from(subscriptions.keys()).filter(key => key.startsWith('user_')).length;
  const adminSubscriptions = Array.from(subscriptions.keys()).filter(key => key.startsWith('admin_')).length;
  
  console.log('📊 Subscription count requested. Users:', userSubscriptions, 'Admins:', adminSubscriptions);
  
  res.json({ 
    count: userSubscriptions,
    adminCount: adminSubscriptions,
    total: subscriptions.size
  });
};

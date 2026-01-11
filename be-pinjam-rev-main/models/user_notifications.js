// Model: user_notifications
// Table: user_notifications (see migration 20251216_add_user_notifications.sql)
const pool = require('../config/config').pool;

const UserNotification = {
  async create({ user_id = null, type = 'info', message, is_broadcast = 0 }) {
    const result = await pool.query(
      'INSERT INTO user_notifications (user_id, type, message, is_broadcast) VALUES ($1, $2, $3, $4) RETURNING id',
      [user_id, type, message, is_broadcast]
    );
    return result.rows[0].id;
  },
  async getForUser(user_id, limit = 30) {
    const result = await pool.query(
      'SELECT * FROM user_notifications WHERE user_id IS NULL OR user_id = $1 ORDER BY createdAt DESC LIMIT $2',
      [user_id, limit]
    );
    return result.rows;
  },
  async getAllBroadcasts(limit = 30) {
    const result = await pool.query(
      'SELECT * FROM user_notifications WHERE is_broadcast=1 ORDER BY createdAt DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }
};

module.exports = UserNotification;

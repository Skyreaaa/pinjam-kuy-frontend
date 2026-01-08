require('dotenv').config();
// User notification API endpoint
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserNotification = require('../models/user_notifications');

// Middleware: user auth
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' });
  const token = authHeader.split(' ')[1];
  if (!process.env.JWT_SECRET) { throw new Error('JWT_SECRET wajib di-set di .env!'); }
  const JWT_SECRET = process.env.JWT_SECRET;
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Token tidak valid atau kadaluarsa.' });
    req.user = decoded;
    next();
  });
};

// GET /api/user/notifications?broadcast=1
router.get('/notifications', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const isBroadcast = req.query.broadcast === '1' || req.query.broadcast === 'true';
    if (isBroadcast) {
      // Only broadcast
      const rows = await UserNotification.getAllBroadcasts(30);
      return res.json(rows);
    } else {
      // All for user (personal + broadcast)
      const rows = await UserNotification.getForUser(userId, 30);
      return res.json(rows);
    }
  } catch (err) {
    res.status(500).json({ message: 'Gagal mengambil notifikasi.' });
  }
});

module.exports = router;

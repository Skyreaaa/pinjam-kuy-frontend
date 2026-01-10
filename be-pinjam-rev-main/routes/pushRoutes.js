const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticateUser } = require('../middleware/session');
const jwt = require('jsonwebtoken');

// Middleware auth admin
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' });
  }
  
  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET;
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token tidak valid.' });
    }
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Akses Ditolak. Anda bukan Admin.' });
    }
    req.user = decoded;
    next();
  });
};

// Middleware auth for both user and admin
const authenticateUserOrAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Akses Ditolak. Token tidak disediakan.' });
  }
  
  const token = authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET;
  
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token tidak valid.' });
    }
    req.user = decoded;
    next();
  });
};

// Get VAPID public key (public endpoint)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Subscribe to push notifications (authenticated)
router.post('/subscribe', authenticateUserOrAdmin, pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', authenticateUserOrAdmin, pushController.unsubscribe);

// Admin broadcast notification to all users
router.post('/admin-broadcast', authenticateAdmin, pushController.adminBroadcast);

// Get subscription count (admin only)
router.get('/subscriptions-count', authenticateAdmin, pushController.getSubscriptionsCount);

module.exports = router;

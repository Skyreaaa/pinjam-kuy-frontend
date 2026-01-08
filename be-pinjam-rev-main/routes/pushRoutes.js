const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const { authenticateUser } = require('../middleware/session');
const { authenticateAdmin } = require('../middleware/checkAuth');

// Get VAPID public key (public endpoint)
router.get('/vapid-public-key', pushController.getVapidPublicKey);

// Subscribe to push notifications (authenticated)
router.post('/subscribe', (req, res, next) => {
  // Check if user or admin token exists
  const userAuth = authenticateUser(req, res, () => {});
  const adminAuth = authenticateAdmin(req, res, () => {});
  
  if (!userAuth && !adminAuth) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  next();
}, pushController.subscribe);

// Unsubscribe from push notifications
router.post('/unsubscribe', (req, res, next) => {
  const userAuth = authenticateUser(req, res, () => {});
  const adminAuth = authenticateAdmin(req, res, () => {});
  
  if (!userAuth && !adminAuth) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  next();
}, pushController.unsubscribe);

module.exports = router;

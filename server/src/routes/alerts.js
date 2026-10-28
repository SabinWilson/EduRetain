const express = require('express');
const router = express.Router();
const {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
} = require('../controllers/alertController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(authenticate);
router.use(authorize('admin', 'mentor'));

router.get('/', getAlerts);
router.patch('/read-all', markAllAlertsAsRead);
router.patch('/:id/read', markAlertAsRead);

module.exports = router;

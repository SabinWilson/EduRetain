const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getStudentRisk,
  recomputeRisk,
} = require('../controllers/riskController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(authenticate);

router.get('/dashboard-summary', authorize('admin', 'mentor'), getDashboardSummary);
router.get('/student/:id', authorize('admin', 'mentor'), getStudentRisk);
router.post('/recompute', authorize('admin', 'mentor'), recomputeRisk);

module.exports = router;

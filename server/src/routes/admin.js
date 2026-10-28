const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  toggleUserStatus,
  assignMentor,
  fetchModelMetrics,
  triggerRetrain,
  getRiskThresholds,
  updateRiskThresholds,
} = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validate, createUserSchema, updateThresholdsSchema } = require('../middleware/validation');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/users', getAllUsers);
router.post('/users', validate(createUserSchema), createUser);
router.patch('/users/:id/toggle-status', toggleUserStatus);
router.post('/assign-mentor', assignMentor);

router.get('/model-metrics', fetchModelMetrics);
router.post('/retrain', triggerRetrain);

router.get('/thresholds', getRiskThresholds);
router.put('/thresholds', validate(updateThresholdsSchema), updateRiskThresholds);

module.exports = router;

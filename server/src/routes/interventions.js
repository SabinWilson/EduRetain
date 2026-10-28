const express = require('express');
const router = express.Router();
const {
  getInterventions,
  createIntervention,
  updateIntervention,
  getRecommendedInterventions,
  acceptRecommendation,
} = require('../controllers/interventionController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const {
  validate,
  interventionSchema,
  updateInterventionSchema,
} = require('../middleware/validation');

router.use(authenticate);
router.use(authorize('admin', 'mentor'));

router.get('/', getInterventions);
router.post('/', validate(interventionSchema), createIntervention);
router.patch('/:id', validate(updateInterventionSchema), updateIntervention);
router.get('/recommend/:studentId', getRecommendedInterventions);
router.post('/accept-recommendation', acceptRecommendation);

module.exports = router;

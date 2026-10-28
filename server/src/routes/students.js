const express = require('express');
const router = express.Router();
const {
  getAllStudents,
  getStudentById,
  getStudentFullProfile,
  createStudent,
  updateStudent,
} = require('../controllers/studentController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { validate, createStudentSchema } = require('../middleware/validation');

router.use(authenticate);

router.get('/', authorize('admin', 'mentor'), getAllStudents);
router.post('/', authorize('admin'), validate(createStudentSchema), createStudent);
router.get('/:id', getStudentById);
router.get('/:id/profile', getStudentFullProfile);
router.patch('/:id', authorize('admin', 'mentor'), updateStudent);

module.exports = router;

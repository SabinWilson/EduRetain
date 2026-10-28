const express = require('express');
const router = express.Router();
const {
  importStudentsCSV,
  importAttendanceCSV,
  importGradesCSV,
  importLMSCSV,
} = require('../controllers/importController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadCSV } = require('../middleware/upload');

router.use(authenticate);
router.use(authorize('admin'));

router.post('/students', uploadCSV.single('file'), importStudentsCSV);
router.post('/attendance', uploadCSV.single('file'), importAttendanceCSV);
router.post('/grades', uploadCSV.single('file'), importGradesCSV);
router.post('/lms', uploadCSV.single('file'), importLMSCSV);

module.exports = router;

const {
  Student,
  User,
  Attendance,
  Grade,
  LMSActivity,
  RiskScore,
  Intervention,
  Alert,
} = require('../models');
const { aggregateStudentFeatures } = require('../services/studentAggregator');
const { predictRisk } = require('../services/mlService');

const getAllStudents = async (req, res, next) => {
  try {
    const {
      department,
      year,
      semester,
      riskLevel,
      search,
      mentorId,
      page = 1,
      limit = 50,
      sortBy = 'currentRiskScore',
      order = 'desc',
    } = req.query;

    const query = {};

    // Role-based restrictions: mentors see assigned students unless requesting all or admin
    if (req.user.role === 'mentor' && !req.query.all) {
      query.mentor = req.user._id;
    } else if (mentorId) {
      query.mentor = mentorId;
    }

    if (department) query.department = department;
    if (year) query.year = parseInt(year, 10);
    if (semester) query.semester = parseInt(semester, 10);
    if (riskLevel && riskLevel !== 'All') query.currentRiskLevel = riskLevel;

    // Search by rollNo or student name
    let userFilter = null;
    if (search && search.trim() !== '') {
      const users = await User.find({
        name: { $regex: search.trim(), $options: 'i' },
      }).select('_id');
      const userIds = users.map((u) => u._id);

      query.$or = [
        { rollNo: { $regex: search.trim(), $options: 'i' } },
        { user: { $in: userIds } },
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const totalCount = await Student.countDocuments(query);

    const students = await Student.find(query)
      .populate('user', 'name email department isActive')
      .populate('mentor', 'name email department')
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      total: totalCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      count: students.length,
      data: students,
    });
  } catch (err) {
    next(err);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate('user', 'name email department isActive')
      .populate('mentor', 'name email department');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Role check: if student, can only view own profile
    const studentUserId = student.user?._id ? student.user._id.toString() : student.user ? student.user.toString() : null;
    const reqUserId = req.user?._id ? req.user._id.toString() : req.user ? req.user.toString() : null;
    if (req.user.role === 'student' && studentUserId !== reqUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Students can only view their own record.',
      });
    }


    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (err) {
    next(err);
  }
};

const getStudentFullProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await Student.findById(id)
      .populate('user', 'name email department isActive')
      .populate('mentor', 'name email department');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student profile not found',
      });
    }

    // Role check: student can only view self
    const studentUserId = student.user?._id ? student.user._id.toString() : student.user ? student.user.toString() : null;
    const reqUserId = req.user?._id ? req.user._id.toString() : req.user ? req.user.toString() : null;
    if (req.user.role === 'student' && studentUserId !== reqUserId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Students can only view their own record.',
      });
    }


    // Attendance history
    const attendance = await Attendance.find({ student: id }).sort({ createdAt: 1 });

    // Academic grades history
    const grades = await Grade.find({ student: id }).sort({ semester: 1, subject: 1 });

    // LMS engagement records
    const lms = await LMSActivity.find({ student: id }).sort({ week: 1 });

    // Latest Risk Score and full score history
    const riskHistory = await RiskScore.find({ student: id })
      .sort({ computedAt: -1 })
      .limit(10);
    const latestRisk = riskHistory[0] || null;

    // Interventions
    const interventions = await Intervention.find({ student: id })
      .populate('mentor', 'name email')
      .sort({ createdAt: -1 });

    // Alerts
    const alerts = await Alert.find({ student: id }).sort({ createdAt: -1 }).limit(10);

    // Summary statistics
    const avgAttendance =
      attendance.length > 0
        ? Math.round(
            (attendance.reduce((acc, c) => acc + (c.percentage || 0), 0) / attendance.length) * 10
          ) / 10
        : null;

    const avgGpa =
      grades.length > 0
        ? Math.round(
            (grades.reduce((acc, c) => acc + (c.gpa || 0), 0) / grades.length) * 100
          ) / 100
        : null;

    const backlogs = grades.filter((g) => g.backlog === true || g.examMarks < 40).length;

    const totalLmsHours =
      lms.length > 0
        ? Math.round(lms.reduce((acc, c) => acc + (c.timeSpentMinutes || 0), 0) / 60)
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        student,
        summary: {
          avgAttendance,
          avgGpa,
          backlogs,
          totalLmsHours,
          totalInterventions: interventions.length,
          openAlerts: alerts.filter((a) => !a.isRead).length,
        },
        attendance,
        grades,
        lms,
        latestRisk,
        riskHistory,
        interventions,
        alerts,
      },
    });
  } catch (err) {
    next(err);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password = 'StudentPassword@123',
      rollNo,
      department,
      program = 'UG',
      year = 1,
      semester = 1,
      mentorId,
      gender = 'Other',
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const existingRoll = await Student.findOne({ rollNo: rollNo.toUpperCase() });
    if (existingRoll) {
      return res.status(409).json({
        success: false,
        message: 'A student with this roll number already exists.',
      });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'student',
      department,
      isActive: true,
    });

    const student = await Student.create({
      user: user._id,
      rollNo: rollNo.toUpperCase(),
      department,
      program,
      year,
      semester,
      mentor: mentorId || null,
      gender,
      currentRiskLevel: 'Low',
      currentRiskScore: 0.15,
    });

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully',
      data: student,
    });
  } catch (err) {
    next(err);
  }
};

const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { department, year, semester, mentorId, academicStatus } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (department) student.department = department;
    if (year) student.year = year;
    if (semester) student.semester = semester;
    if (mentorId !== undefined) student.mentor = mentorId || null;
    if (academicStatus) student.academicStatus = academicStatus;

    await student.save();

    return res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentFullProfile,
  createStudent,
  updateStudent,
};

const { User, Student } = require('../models');
const { generateToken } = require('../middleware/auth');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          user.role === 'mentor'
            ? 'Your faculty mentor account is pending administrator approval. Please contact an administrator.'
            : 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user);

    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = await Student.findOne({ user: user._id });
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: studentProfile ? studentProfile._id : null,
        rollNo: studentProfile ? studentProfile.rollNo : null,
      },
    });
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, department, rollNo, year, semester, program } = req.body;

    // Hard server-side guard: Never allow self-registration as admin
    if (role === 'admin' || !['student', 'mentor'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Self-registration as administrator is strictly prohibited.',
      });
    }

    const normalizedEmail = (email || '').trim().toLowerCase();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await User.hashPassword(password);

    if (role === 'student') {
      const normalizedRollNo = (rollNo || '').trim().toUpperCase();

      const existingRoll = await Student.findOne({ rollNo: normalizedRollNo });
      if (existingRoll) {
        return res.status(409).json({
          success: false,
          message: 'A student with this roll number is already registered.',
        });
      }

      // Auto-assign mentor from same department with fewest students
      let assignedMentorId = null;
      const activeMentors = await User.find({
        role: 'mentor',
        department: department.trim(),
        isActive: true,
      });

      if (activeMentors.length > 0) {
        const mentorIds = activeMentors.map((m) => m._id);
        const studentCounts = await Student.aggregate([
          { $match: { mentor: { $in: mentorIds } } },
          { $group: { _id: '$mentor', count: { $sum: 1 } } },
        ]);

        const countMap = {};
        studentCounts.forEach((sc) => {
          countMap[sc._id.toString()] = sc.count;
        });

        activeMentors.sort((a, b) => {
          const countA = countMap[a._id.toString()] || 0;
          const countB = countMap[b._id.toString()] || 0;
          return countA - countB;
        });

        assignedMentorId = activeMentors[0]._id;
      }

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'student',
        department: department.trim(),
        isActive: true,
      });

      const studentProfile = await Student.create({
        user: user._id,
        rollNo: normalizedRollNo,
        department: department.trim(),
        program: program || 'UG',
        year: parseInt(year, 10),
        semester: parseInt(semester, 10),
        mentor: assignedMentorId || undefined,
        academicStatus: 'Active',
        currentRiskLevel: 'Uncomputed',
        currentRiskScore: 0.0,
      });

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'Student account registered successfully.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          studentId: studentProfile._id,
          rollNo: studentProfile.rollNo,
        },
      });
    }

    if (role === 'mentor') {
      // Mentor accounts are created with isActive=false pending administrator approval
      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'mentor',
        department: department.trim(),
        isActive: false,
      });

      return res.status(201).json({
        success: true,
        message:
          'Faculty mentor registration submitted successfully. Your account is pending administrator approval before you can log in.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          isActive: false,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let studentProfile = null;

    if (user.role === 'student') {
      studentProfile = await Student.findOne({ user: user._id }).populate('mentor', 'name email department');
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        studentId: studentProfile ? studentProfile._id : null,
        rollNo: studentProfile ? studentProfile.rollNo : null,
        studentProfile,
      },
    });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = { login, register, getMe, logout };


const { User, Student, SystemConfig, ModelMeta } = require('../models');
const { getModelMetrics, triggerModelTraining, checkMLHealth } = require('../services/mlService');

const getAllUsers = async (req, res, next) => {
  try {
    const { role, department, search, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (role && role !== 'All') query.role = role;
    if (department) query.department = department;
    if (status === 'pending' || status === 'inactive') {
      query.isActive = false;
    } else if (status === 'active') {
      query.isActive = true;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await User.countDocuments(query);
    const pendingMentorsCount = await User.countDocuments({ role: 'mentor', isActive: false });
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      total,
      pendingCount: pendingMentorsCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: users,
    });
  } catch (err) {
    next(err);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, department } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      department,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: `User '${user.name}' created successfully as ${role}.`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own admin account.' });
    }

    user.isActive = !user.isActive;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}.`,
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

const assignMentor = async (req, res, next) => {
  try {
    const { studentIds, mentorId } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'studentIds array is required' });
    }

    const mentor = await User.findOne({ _id: mentorId, role: 'mentor' });
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found or role is not mentor' });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { $set: { mentor: mentor._id } }
    );

    return res.status(200).json({
      success: true,
      message: `Assigned ${result.modifiedCount} student(s) to mentor ${mentor.name}.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

const fetchModelMetrics = async (req, res, next) => {
  try {
    const metricsData = await getModelMetrics();
    const health = await checkMLHealth();

    return res.status(200).json({
      success: true,
      health,
      ...metricsData,
    });
  } catch (err) {
    next(err);
  }
};

const triggerRetrain = async (req, res, next) => {
  try {
    const result = await triggerModelTraining();

    return res.status(200).json({
      success: true,
      message: 'Model retraining triggered and completed successfully.',
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Retraining failed: ${err.message}`,
    });
  }
};

const getRiskThresholds = async (req, res, next) => {
  try {
    let config = await SystemConfig.findOne({ key: 'risk_config' });
    if (!config) {
      config = await SystemConfig.create({
        key: 'risk_config',
        lowMediumThreshold: 0.35,
        mediumHighThreshold: 0.65,
      });
    }

    return res.status(200).json({
      success: true,
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

const updateRiskThresholds = async (req, res, next) => {
  try {
    const { lowMediumThreshold, mediumHighThreshold, emailAlertsEnabled } = req.body;

    if (lowMediumThreshold >= mediumHighThreshold) {
      return res.status(400).json({
        success: false,
        message: 'Low/Medium threshold must be strictly less than Medium/High threshold.',
      });
    }

    let config = await SystemConfig.findOne({ key: 'risk_config' });
    if (!config) {
      config = new SystemConfig({ key: 'risk_config' });
    }

    config.lowMediumThreshold = lowMediumThreshold;
    config.mediumHighThreshold = mediumHighThreshold;
    if (emailAlertsEnabled !== undefined) {
      config.emailAlertsEnabled = emailAlertsEnabled;
    }
    config.lastUpdatedBy = req.user._id;

    await config.save();

    return res.status(200).json({
      success: true,
      message: 'Risk thresholds updated successfully.',
      data: config,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  toggleUserStatus,
  assignMentor,
  fetchModelMetrics,
  triggerRetrain,
  getRiskThresholds,
  updateRiskThresholds,
};

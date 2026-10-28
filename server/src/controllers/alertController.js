const { Alert, Student } = require('../models');

const getAlerts = async (req, res, next) => {
  try {
    const { unreadOnly, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role === 'mentor' && !req.query.all) {
      query.mentor = req.user._id;
    }

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Alert.countDocuments(query);
    const unreadCount = await Alert.countDocuments({
      ...(req.user.role === 'mentor' && !req.query.all ? { mentor: req.user._id } : {}),
      isRead: false,
    });

    const alerts = await Alert.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      total,
      unreadCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: alerts,
    });
  } catch (err) {
    next(err);
  }
};

const markAlertAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findById(id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.isRead = true;
    alert.readAt = new Date();
    await alert.save();

    return res.status(200).json({
      success: true,
      message: 'Alert marked as read',
      data: alert,
    });
  } catch (err) {
    next(err);
  }
};

const markAllAlertsAsRead = async (req, res, next) => {
  try {
    const query = { isRead: false };
    if (req.user.role === 'mentor') {
      query.mentor = req.user._id;
    }

    const result = await Alert.updateMany(query, {
      $set: { isRead: true, readAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} alerts as read.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  markAlertAsRead,
  markAllAlertsAsRead,
};

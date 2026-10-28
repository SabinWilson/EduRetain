const { Intervention, Student, RiskScore } = require('../models');
const { generateRecommendations } = require('../services/recommendationEngine');

const getInterventions = async (req, res, next) => {
  try {
    const { studentId, status, page = 1, limit = 50 } = req.query;
    const query = {};

    if (req.user.role === 'mentor' && !req.query.all) {
      query.mentor = req.user._id;
    }

    if (studentId) query.student = studentId;
    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Intervention.countDocuments(query);

    const interventions = await Intervention.find(query)
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' },
      })
      .populate('mentor', 'name email department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: interventions,
    });
  } catch (err) {
    next(err);
  }
};

const createIntervention = async (req, res, next) => {
  try {
    const {
      studentId,
      type,
      description,
      recommendedBySystem = false,
      targetRiskFactor = '',
      status = 'Planned',
      outcomeNotes = '',
    } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const mentorId = req.user.role === 'mentor' ? req.user._id : (student.mentor || req.user._id);

    const intervention = await Intervention.create({
      student: studentId,
      mentor: mentorId,
      type,
      description,
      recommendedBySystem,
      targetRiskFactor,
      status,
      outcomeNotes,
      preInterventionScore: student.currentRiskScore,
      completedAt: status === 'Completed' ? new Date() : null,
    });

    return res.status(201).json({
      success: true,
      message: 'Intervention logged successfully',
      data: intervention,
    });
  } catch (err) {
    next(err);
  }
};

const updateIntervention = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, outcomeNotes, description } = req.body;

    const intervention = await Intervention.findById(id).populate('student');
    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention not found' });
    }

    if (status) intervention.status = status;
    if (outcomeNotes !== undefined) intervention.outcomeNotes = outcomeNotes;
    if (description) intervention.description = description;

    if (status === 'Completed') {
      intervention.completedAt = new Date();
      // Record post-intervention score to evaluate retention improvement
      if (intervention.student) {
        intervention.postInterventionScore = intervention.student.currentRiskScore;
        if (intervention.preInterventionScore !== null) {
          intervention.scoreDelta = Math.round(
            (intervention.postInterventionScore - intervention.preInterventionScore) * 1000
          ) / 1000;
        }
      }
    }

    await intervention.save();

    return res.status(200).json({
      success: true,
      message: 'Intervention updated successfully',
      data: intervention,
    });
  } catch (err) {
    next(err);
  }
};

const getRecommendedInterventions = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const latestRisk = await RiskScore.findOne({ student: studentId }).sort({ computedAt: -1 });

    const topFactors = latestRisk ? latestRisk.topFactors : [];
    const currentScore = latestRisk ? latestRisk.score : student.currentRiskScore;

    const recommendations = generateRecommendations(student, topFactors, currentScore);

    // Filter out recommendations that already have active interventions of same type
    const activeInterventions = await Intervention.find({
      student: studentId,
      status: { $in: ['Planned', 'In Progress'] },
    });
    const activeTypes = new Set(activeInterventions.map((i) => i.type));

    const pendingRecommendations = recommendations.filter((r) => !activeTypes.has(r.type));

    return res.status(200).json({
      success: true,
      studentId,
      riskLevel: student.currentRiskLevel,
      riskScore: currentScore,
      data: pendingRecommendations,
    });
  } catch (err) {
    next(err);
  }
};

const acceptRecommendation = async (req, res, next) => {
  try {
    const { studentId, type, description, targetRiskFactor } = req.body;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const mentorId = req.user.role === 'mentor' ? req.user._id : (student.mentor || req.user._id);

    const intervention = await Intervention.create({
      student: studentId,
      mentor: mentorId,
      type,
      description,
      recommendedBySystem: true,
      targetRiskFactor: targetRiskFactor || '',
      status: 'Planned',
      preInterventionScore: student.currentRiskScore,
    });

    return res.status(201).json({
      success: true,
      message: `Accepted recommendation: '${type}' is now planned.`,
      data: intervention,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getInterventions,
  createIntervention,
  updateIntervention,
  getRecommendedInterventions,
  acceptRecommendation,
};

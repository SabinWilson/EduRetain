const mongoose = require('mongoose');

const RiskFactorSchema = new mongoose.Schema(
  {
    feature: { type: String, required: true },
    label: { type: String, default: '' },
    value: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    shap_value: { type: Number, default: 0 },
    abs_impact: { type: Number, default: 0 },
    is_risk_driver: { type: Boolean, default: true },
    explanation: { type: String, required: true },
  },
  { _id: false }
);

const RiskScoreSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    level: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      required: true,
      index: true,
    },
    topFactors: [RiskFactorSchema],
    allFactors: [RiskFactorSchema],
    modelVersion: {
      type: String,
      default: 'v1.0.0',
    },
    engine: {
      type: String,
      enum: ['ML_MODEL', 'RULE_BASED'],
      default: 'ML_MODEL',
    },
    featureSnapshot: {
      avg_attendance: Number,
      attendance_trend: Number,
      avg_gpa: Number,
      gpa_trend: Number,
      backlog_count: Number,
      assignment_miss_rate: Number,
      lms_login_frequency: Number,
      lms_time_spent: Number,
      engagement_trend: Number,
      semester: Number,
      year: Number,
    },
    computedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

RiskScoreSchema.index({ student: 1, computedAt: -1 });

module.exports = mongoose.model('RiskScore', RiskScoreSchema);

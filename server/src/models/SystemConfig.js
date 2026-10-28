const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'risk_config',
    },
    lowMediumThreshold: {
      type: Number,
      default: 0.35,
      min: 0.05,
      max: 0.9,
    },
    mediumHighThreshold: {
      type: Number,
      default: 0.65,
      min: 0.1,
      max: 0.95,
    },
    weights: {
      attendance: { type: Number, default: 0.25 },
      attendanceTrend: { type: Number, default: 0.10 },
      gpa: { type: Number, default: 0.25 },
      gpaTrend: { type: Number, default: 0.10 },
      backlogs: { type: Number, default: 0.15 },
      assignmentMiss: { type: Number, default: 0.10 },
      lmsEngagement: { type: Number, default: 0.05 },
    },
    emailAlertsEnabled: {
      type: Boolean,
      default: false,
    },
    alertRecipientsEmail: {
      type: String,
      default: 'mentor-alerts@institution.edu',
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);

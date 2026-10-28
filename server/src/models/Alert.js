const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: [
        'HIGH_RISK_THRESHOLD',
        'RISK_INCREASE',
        'ATTENDANCE_CRITICAL',
        'ACADEMIC_PROBATION',
        'LMS_INACTIVE',
      ],
      default: 'HIGH_RISK_THRESHOLD',
    },
    message: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'High',
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    previousScore: {
      type: Number,
      default: 0,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

AlertSchema.index({ mentor: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', AlertSchema);

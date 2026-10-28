const mongoose = require('mongoose');

const LMSActivitySchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    week: {
      type: Number,
      required: true,
      min: 1,
      max: 52,
    },
    logins: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignmentsSubmitted: {
      type: Number,
      default: 0,
      min: 0,
    },
    assignmentsMissed: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeSpentMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

LMSActivitySchema.index({ student: 1, week: 1 });

module.exports = mongoose.model('LMSActivity', LMSActivitySchema);

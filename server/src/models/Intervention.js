const mongoose = require('mongoose');

const InterventionSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'Attendance Counselling Meeting',
        'Peer Tutoring / Remedial Classes',
        'Mentor Check-in and Engagement Nudge',
        'Academic Recovery Plan',
        'LMS Technical & Study Support',
        'General Academic Guidance',
      ],
    },
    description: {
      type: String,
      required: true,
    },
    recommendedBySystem: {
      type: Boolean,
      default: false,
    },
    targetRiskFactor: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Planned', 'In Progress', 'Completed', 'Dismissed'],
      default: 'Planned',
      index: true,
    },
    outcomeNotes: {
      type: String,
      default: '',
    },
    preInterventionScore: {
      type: Number,
      default: null,
    },
    postInterventionScore: {
      type: Number,
      default: null,
    },
    scoreDelta: {
      type: Number,
      default: null,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

InterventionSchema.index({ student: 1, status: 1 });
InterventionSchema.index({ mentor: 1, status: 1 });

module.exports = mongoose.model('Intervention', InterventionSchema);

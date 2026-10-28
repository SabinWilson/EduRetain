const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    internalMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    examMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    gpa: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    backlog: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

GradeSchema.index({ student: 1, subject: 1, semester: 1 });

module.exports = mongoose.model('Grade', GradeSchema);

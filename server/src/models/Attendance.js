const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema(
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
    month: {
      type: String,
      required: true,
      trim: true,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    totalClasses: {
      type: Number,
      default: 30,
    },
    attendedClasses: {
      type: Number,
      default: 24,
    },
  },
  {
    timestamps: true,
  }
);

AttendanceSchema.index({ student: 1, subject: 1, month: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);

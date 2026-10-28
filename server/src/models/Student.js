const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    rollNo: {
      type: String,
      required: [true, 'Roll number is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      index: true,
    },
    program: {
      type: String,
      enum: ['UG', 'PG'],
      default: 'UG',
      required: true,
    },
    year: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      index: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Non-Binary', 'Other'],
      default: 'Other',
    },
    admissionYear: {
      type: Number,
      default: () => new Date().getFullYear() - 1,
    },
    academicStatus: {
      type: String,
      enum: ['Active', 'At-Risk', 'On-Leave', 'Graduated', 'Dropped-Out'],
      default: 'Active',
    },
    currentRiskLevel: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Uncomputed'],
      default: 'Uncomputed',
      index: true,
    },
    currentRiskScore: {
      type: Number,
      default: 0.0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Student', StudentSchema);

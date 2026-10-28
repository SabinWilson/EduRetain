const fs = require('fs');
const csv = require('csv-parser');
const { Student, User, Attendance, Grade, LMSActivity } = require('../models');
const { aggregateStudentFeatures } = require('../services/studentAggregator');
const { predictRisk } = require('../services/mlService');
const { evaluateAndCreateAlerts } = require('../services/alertService');

const parseCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

const recomputeStudentsBatch = async (studentIds) => {
  const uniqueIds = Array.from(new Set(studentIds));
  for (const id of uniqueIds) {
    try {
      const student = await Student.findById(id).populate('user');
      if (!student) continue;

      const features = await aggregateStudentFeatures(student);
      const prediction = await predictRisk(features);

      const previousScore = {
        score: student.currentRiskScore,
        level: student.currentRiskLevel,
      };

      student.currentRiskScore = prediction.score;
      student.currentRiskLevel = prediction.level;
      await student.save();

      await evaluateAndCreateAlerts({
        student,
        previousScore,
        newScore: prediction.score,
        level: prediction.level,
        topFactors: prediction.topFactors,
      });
    } catch (err) {
      console.error(`[CSV Import] Error recomputing risk for student ${id}:`, err.message);
    }
  }
};

const importStudentsCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const rows = await parseCSVFile(req.file.path);
    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const row of rows) {
      const name = row.name || row.Name;
      const email = (row.email || row.Email || '').toLowerCase().trim();
      const rollNo = (row.rollNo || row.roll_no || row.RollNo || '').toUpperCase().trim();
      const department = row.department || row.Department || 'Computer Science';
      const program = (row.program || row.Program || 'UG').toUpperCase();
      const year = parseInt(row.year || row.Year || '1', 10);
      const semester = parseInt(row.semester || row.Semester || '1', 10);
      const gender = row.gender || row.Gender || 'Other';

      if (!email || !rollNo || !name) {
        skipped++;
        errors.push({ row, reason: 'Missing email, rollNo, or name' });
        continue;
      }

      let user = await User.findOne({ email });
      if (!user) {
        const passwordHash = await User.hashPassword('StudentPassword@123');
        user = await User.create({
          name,
          email,
          passwordHash,
          role: 'student',
          department,
          isActive: true,
        });
      }

      let student = await Student.findOne({ rollNo });
      if (!student) {
        student = await Student.create({
          user: user._id,
          rollNo,
          department,
          program,
          year,
          semester,
          gender,
          currentRiskLevel: 'Low',
          currentRiskScore: 0.15,
        });
        imported++;
      } else {
        skipped++;
      }
    }

    // Cleanup uploaded temp file
    fs.unlink(req.file.path, () => {});

    return res.status(200).json({
      success: true,
      message: `Processed CSV. Imported: ${imported}, Skipped (already exists or invalid): ${skipped}.`,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
};

const importAttendanceCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const rows = await parseCSVFile(req.file.path);
    let imported = 0;
    const affectedStudentIds = [];

    for (const row of rows) {
      const rollNo = (row.rollNo || row.roll_no || row.RollNo || '').toUpperCase().trim();
      const subject = row.subject || row.Subject;
      const month = row.month || row.Month || 'Current Term';
      const percentage = parseFloat(row.percentage || row.Percentage || '80');
      const totalClasses = parseInt(row.totalClasses || row.total_classes || '30', 10);
      const attendedClasses = parseInt(row.attendedClasses || row.attended_classes || '24', 10);

      const student = await Student.findOne({ rollNo });
      if (!student) continue;

      await Attendance.findOneAndUpdate(
        { student: student._id, subject, month },
        { percentage, totalClasses, attendedClasses },
        { upsert: true, new: true }
      );

      affectedStudentIds.push(student._id.toString());
      imported++;
    }

    fs.unlink(req.file.path, () => {});

    // Asynchronously trigger recomputation for affected students
    recomputeStudentsBatch(affectedStudentIds).catch((e) =>
      console.error('[Attendance Import] Recompute error:', e.message)
    );

    return res.status(200).json({
      success: true,
      message: `Imported ${imported} attendance records. Risk scoring recomputed for affected students.`,
      imported,
      affectedStudents: Array.from(new Set(affectedStudentIds)).length,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

const importGradesCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const rows = await parseCSVFile(req.file.path);
    let imported = 0;
    const affectedStudentIds = [];

    for (const row of rows) {
      const rollNo = (row.rollNo || row.roll_no || row.RollNo || '').toUpperCase().trim();
      const subject = row.subject || row.Subject;
      const semester = parseInt(row.semester || row.Semester || '1', 10);
      const internalMarks = parseFloat(row.internalMarks || row.internal_marks || '75');
      const examMarks = parseFloat(row.examMarks || row.exam_marks || '70');
      const gpa = parseFloat(row.gpa || row.GPA || '7.5');
      const backlog = row.backlog === 'true' || row.backlog === '1' || examMarks < 40;

      const student = await Student.findOne({ rollNo });
      if (!student) continue;

      await Grade.findOneAndUpdate(
        { student: student._id, subject, semester },
        { internalMarks, examMarks, gpa, backlog },
        { upsert: true, new: true }
      );

      affectedStudentIds.push(student._id.toString());
      imported++;
    }

    fs.unlink(req.file.path, () => {});

    // Asynchronously trigger recomputation
    recomputeStudentsBatch(affectedStudentIds).catch((e) =>
      console.error('[Grades Import] Recompute error:', e.message)
    );

    return res.status(200).json({
      success: true,
      message: `Imported ${imported} grade records. Risk scoring recomputed for affected students.`,
      imported,
      affectedStudents: Array.from(new Set(affectedStudentIds)).length,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

const importLMSCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file' });
    }

    const rows = await parseCSVFile(req.file.path);
    let imported = 0;
    const affectedStudentIds = [];

    for (const row of rows) {
      const rollNo = (row.rollNo || row.roll_no || row.RollNo || '').toUpperCase().trim();
      const week = parseInt(row.week || row.Week || '1', 10);
      const logins = parseInt(row.logins || row.Logins || '5', 10);
      const assignmentsSubmitted = parseInt(row.assignmentsSubmitted || row.assignments_submitted || '2', 10);
      const assignmentsMissed = parseInt(row.assignmentsMissed || row.assignments_missed || '0', 10);
      const timeSpentMinutes = parseInt(row.timeSpentMinutes || row.time_spent_minutes || '120', 10);

      const student = await Student.findOne({ rollNo });
      if (!student) continue;

      await LMSActivity.findOneAndUpdate(
        { student: student._id, week },
        { logins, assignmentsSubmitted, assignmentsMissed, timeSpentMinutes },
        { upsert: true, new: true }
      );

      affectedStudentIds.push(student._id.toString());
      imported++;
    }

    fs.unlink(req.file.path, () => {});

    // Asynchronously trigger recomputation
    recomputeStudentsBatch(affectedStudentIds).catch((e) =>
      console.error('[LMS Import] Recompute error:', e.message)
    );

    return res.status(200).json({
      success: true,
      message: `Imported ${imported} LMS engagement records. Risk scoring recomputed for affected students.`,
      imported,
      affectedStudents: Array.from(new Set(affectedStudentIds)).length,
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlink(req.file.path, () => {});
    next(err);
  }
};

module.exports = {
  importStudentsCSV,
  importAttendanceCSV,
  importGradesCSV,
  importLMSCSV,
};

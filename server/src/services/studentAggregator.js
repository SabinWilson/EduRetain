const { Attendance, Grade, LMSActivity } = require('../models');

async function aggregateStudentFeatures(student) {
  const studentId = student._id;

  // 1. Attendance aggregation
  const attendanceRecords = await Attendance.find({ student: studentId }).sort({ createdAt: 1 });
  let avg_attendance = 82.0;
  let attendance_trend = 0.0;

  if (attendanceRecords.length > 0) {
    const totalPct = attendanceRecords.reduce((acc, cur) => acc + (cur.percentage || 0), 0);
    avg_attendance = Math.round((totalPct / attendanceRecords.length) * 10) / 10;

    if (attendanceRecords.length >= 2) {
      const half = Math.floor(attendanceRecords.length / 2);
      const firstHalf = attendanceRecords.slice(0, half);
      const secondHalf = attendanceRecords.slice(half);

      const avg1 = firstHalf.reduce((a, c) => a + c.percentage, 0) / firstHalf.length;
      const avg2 = secondHalf.reduce((a, c) => a + c.percentage, 0) / secondHalf.length;
      attendance_trend = Math.round((avg2 - avg1) * 10) / 10;
    }
  }

  // 2. Grades aggregation
  const gradeRecords = await Grade.find({ student: studentId }).sort({ semester: 1 });
  let avg_gpa = 7.5;
  let gpa_trend = 0.0;
  let backlog_count = 0;

  if (gradeRecords.length > 0) {
    const totalGpa = gradeRecords.reduce((acc, cur) => acc + (cur.gpa || 0), 0);
    avg_gpa = Math.round((totalGpa / gradeRecords.length) * 100) / 100;
    backlog_count = gradeRecords.filter((g) => g.backlog === true || g.examMarks < 40).length;

    // Semester trend
    const semesterGroups = {};
    gradeRecords.forEach((g) => {
      if (!semesterGroups[g.semester]) semesterGroups[g.semester] = [];
      semesterGroups[g.semester].push(g.gpa);
    });

    const sems = Object.keys(semesterGroups).map(Number).sort((a, b) => a - b);
    if (sems.length >= 2) {
      const gpaFirst = semesterGroups[sems[0]].reduce((a, b) => a + b, 0) / semesterGroups[sems[0]].length;
      const gpaLast = semesterGroups[sems[sems.length - 1]].reduce((a, b) => a + b, 0) / semesterGroups[sems[sems.length - 1]].length;
      gpa_trend = Math.round((gpaLast - gpaFirst) * 100) / 100;
    }
  }

  // 3. LMS Activity aggregation
  const lmsRecords = await LMSActivity.find({ student: studentId }).sort({ week: 1 });
  let assignment_miss_rate = 0.08;
  let lms_login_frequency = 12.0;
  let lms_time_spent = 240.0;
  let engagement_trend = 0.0;

  if (lmsRecords.length > 0) {
    const totalLogins = lmsRecords.reduce((a, c) => a + (c.logins || 0), 0);
    const totalTime = lmsRecords.reduce((a, c) => a + (c.timeSpentMinutes || 0), 0);
    const totalSubmitted = lmsRecords.reduce((a, c) => a + (c.assignmentsSubmitted || 0), 0);
    const totalMissed = lmsRecords.reduce((a, c) => a + (c.assignmentsMissed || 0), 0);

    lms_login_frequency = Math.round((totalLogins / lmsRecords.length) * 10) / 10;
    lms_time_spent = Math.round(totalTime / lmsRecords.length);

    const totalTasks = totalSubmitted + totalMissed;
    if (totalTasks > 0) {
      assignment_miss_rate = Math.round((totalMissed / totalTasks) * 1000) / 1000;
    }

    if (lmsRecords.length >= 2) {
      const half = Math.floor(lmsRecords.length / 2);
      const early = lmsRecords.slice(0, half).reduce((a, c) => a + c.timeSpentMinutes, 0) / half;
      const late = lmsRecords.slice(half).reduce((a, c) => a + c.timeSpentMinutes, 0) / (lmsRecords.length - half);
      if (early > 0) {
        engagement_trend = Math.round(((late - early) / early) * 1000) / 10;
      }
    }
  }

  return {
    student_id: student._id.toString(),
    avg_attendance,
    attendance_trend,
    avg_gpa,
    gpa_trend,
    backlog_count,
    assignment_miss_rate,
    lms_login_frequency,
    lms_time_spent,
    engagement_trend,
    semester: student.semester || 1,
    year: student.year || 1,
  };
}

module.exports = { aggregateStudentFeatures };

const { Alert, User } = require('../models');
const { sendHighRiskAlertEmail } = require('./emailService');

let ioInstance = null;

function setSocketIO(io) {
  ioInstance = io;
}

async function evaluateAndCreateAlerts({ student, previousScore, newScore, level, topFactors }) {
  const alertsCreated = [];

  // Check condition 1: Student crossed into High risk
  const isHighRisk = level === 'High';
  const crossedHighRisk = isHighRisk && (!previousScore || previousScore.level !== 'High');

  // Check condition 2: Significant score jump (> 0.20 increase)
  const scoreJump = previousScore ? newScore - previousScore.score >= 0.20 : false;

  let alertType = null;
  let message = null;

  if (crossedHighRisk) {
    alertType = 'HIGH_RISK_THRESHOLD';
    message = `Student ${student.user?.name || student.rollNo} crossed into High dropout risk (${(newScore * 100).toFixed(1)}%). Immediate intervention recommended.`;
  } else if (scoreJump) {
    alertType = 'RISK_INCREASE';
    message = `Rapid risk score escalation (+${((newScore - (previousScore?.score || 0)) * 100).toFixed(1)}%) detected for ${student.user?.name || student.rollNo}.`;
  }

  if (alertType) {
    const alert = await Alert.create({
      student: student._id,
      mentor: student.mentor,
      type: alertType,
      message,
      level,
      score: newScore,
      previousScore: previousScore ? previousScore.score : 0,
      isRead: false,
    });

    alertsCreated.push(alert);

    // Socket.io real-time push
    if (ioInstance) {
      if (student.mentor) {
        ioInstance.to(`mentor-${student.mentor.toString()}`).emit('new-alert', {
          alert,
          student: {
            id: student._id,
            rollNo: student.rollNo,
            name: student.user?.name,
          },
        });
      }
      // Broadcast to all admins
      ioInstance.to('admin-room').emit('new-alert', {
        alert,
        student: {
          id: student._id,
          rollNo: student.rollNo,
          name: student.user?.name,
        },
      });
    }

    // Email alert
    if (crossedHighRisk && student.mentor) {
      const mentor = await User.findById(student.mentor);
      if (mentor && mentor.email) {
        sendHighRiskAlertEmail({
          mentorEmail: mentor.email,
          mentorName: mentor.name,
          studentName: student.user?.name || 'Student',
          rollNo: student.rollNo,
          score: newScore,
          level,
          topFactors,
        }).catch((e) => console.error('[AlertService] Email send error:', e.message));
      }
    }
  }

  return alertsCreated;
}

module.exports = { setSocketIO, evaluateAndCreateAlerts };

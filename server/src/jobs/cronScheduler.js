const cron = require('node-cron');
const { Student, RiskScore } = require('../models');
const { aggregateStudentFeatures } = require('../services/studentAggregator');
const { predictRisk } = require('../services/mlService');
const { evaluateAndCreateAlerts } = require('../services/alertService');

function initCronJobs() {
  // Run nightly at 02:00 AM (0 2 * * *)
  const cronExpression = process.env.CRON_SCHEDULE || '0 2 * * *';

  console.log(`[Cron] Registering nightly risk score re-computation job: '${cronExpression}'`);

  cron.schedule(cronExpression, async () => {
    console.log('[Cron Job] Starting automated nightly risk score re-computation...');
    try {
      const students = await Student.find({ academicStatus: 'Active' }).populate('user');
      let count = 0;
      let alertsCount = 0;

      for (const student of students) {
        const features = await aggregateStudentFeatures(student);
        const prediction = await predictRisk(features);

        const previousScore = await RiskScore.findOne({ student: student._id }).sort({ computedAt: -1 });

        await RiskScore.create({
          student: student._id,
          score: prediction.score,
          level: prediction.level,
          topFactors: prediction.topFactors,
          allFactors: prediction.allFactors,
          modelVersion: prediction.modelVersion,
          engine: prediction.engine,
          featureSnapshot: features,
          computedAt: new Date(),
        });

        student.currentRiskScore = prediction.score;
        student.currentRiskLevel = prediction.level;
        await student.save();

        const alerts = await evaluateAndCreateAlerts({
          student,
          previousScore,
          newScore: prediction.score,
          level: prediction.level,
          topFactors: prediction.topFactors,
        });

        alertsCount += alerts.length;
        count++;
      }

      console.log(`[Cron Job] Nightly re-scoring completed for ${count} students. Generated ${alertsCount} alerts.`);
    } catch (err) {
      console.error('[Cron Job Error] Nightly re-scoring encountered error:', err.message);
    }
  });
}

module.exports = { initCronJobs };

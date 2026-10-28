/**
 * Fallback Rule-Based Scoring Engine
 * Used whenever Python ML service is offline or unreachable.
 * Ensures the system never breaks.
 */

function computeFallbackRiskScore(features, thresholds = { lowMedium: 0.35, mediumHigh: 0.65 }) {
  const {
    avg_attendance = 80,
    attendance_trend = 0,
    avg_gpa = 7.0,
    gpa_trend = 0,
    backlog_count = 0,
    assignment_miss_rate = 0.1,
    lms_login_frequency = 10,
    lms_time_spent = 200,
    engagement_trend = 0,
    semester = 1,
    year = 1,
  } = features;

  // 1. Attendance penalty (0 to 1)
  // Below 75% triggers penalty; below 50% is severe
  let attPenalty = 0;
  if (avg_attendance < 75) {
    attPenalty = Math.min(1.0, (75 - avg_attendance) / 40);
  }
  // Negative trend adds penalty
  const attTrendPenalty = attendance_trend < 0 ? Math.min(1.0, Math.abs(attendance_trend) / 25) : 0;

  // 2. GPA penalty (0 to 1)
  // Below 6.5 triggers penalty
  let gpaPenalty = 0;
  if (avg_gpa < 6.5) {
    gpaPenalty = Math.min(1.0, (6.5 - avg_gpa) / 4.5);
  }
  const gpaTrendPenalty = gpa_trend < 0 ? Math.min(1.0, Math.abs(gpa_trend) / 2.0) : 0;

  // 3. Backlog penalty (0 to 1)
  const backlogPenalty = Math.min(1.0, backlog_count / 3.0);

  // 4. LMS assignment miss penalty (0 to 1)
  const assignmentPenalty = Math.min(1.0, assignment_miss_rate / 0.5);

  // 5. LMS engagement penalty (0 to 1)
  let lmsPenalty = 0;
  if (lms_login_frequency < 5) {
    lmsPenalty += 0.5 * ((5 - lms_login_frequency) / 5);
  }
  if (lms_time_spent < 120) {
    lmsPenalty += 0.5 * ((120 - lms_time_spent) / 120);
  }
  const engagementTrendPenalty = engagement_trend < 0 ? Math.min(1.0, Math.abs(engagement_trend) / 40) : 0;

  // Weighted composite score (weights sum to 1.0)
  const weightedScore =
    0.25 * attPenalty +
    0.08 * attTrendPenalty +
    0.25 * gpaPenalty +
    0.08 * gpaTrendPenalty +
    0.16 * backlogPenalty +
    0.10 * assignmentPenalty +
    0.05 * lmsPenalty +
    0.03 * engagementTrendPenalty;

  // Clamp between 0.02 and 0.98
  const score = Math.max(0.02, Math.min(0.98, Math.round(weightedScore * 1000) / 1000));

  let level = 'Low';
  if (score >= thresholds.mediumHigh) {
    level = 'High';
  } else if (score >= thresholds.lowMedium) {
    level = 'Medium';
  }

  // Generate factors & plain-language explanations
  const candidateFactors = [
    {
      feature: 'avg_attendance',
      label: 'Average Attendance',
      value: Math.round(avg_attendance * 10) / 10,
      unit: '%',
      shap_value: Math.round((attPenalty * 0.25) * 1000) / 1000,
      abs_impact: Math.round((attPenalty * 0.25) * 1000) / 1000,
      is_risk_driver: avg_attendance < 75,
      explanation:
        avg_attendance < 75
          ? `Low attendance (${avg_attendance.toFixed(1)}%) below the mandatory 75% threshold.`
          : `Consistent lecture attendance (${avg_attendance.toFixed(1)}%) supports academic continuity.`,
    },
    {
      feature: 'avg_gpa',
      label: 'Cumulative GPA',
      value: Math.round(avg_gpa * 100) / 100,
      unit: '/10',
      shap_value: Math.round((gpaPenalty * 0.25) * 1000) / 1000,
      abs_impact: Math.round((gpaPenalty * 0.25) * 1000) / 1000,
      is_risk_driver: avg_gpa < 6.5,
      explanation:
        avg_gpa < 6.5
          ? `Current GPA (${avg_gpa.toFixed(2)}) is below academic benchmark.`
          : `Healthy cumulative GPA (${avg_gpa.toFixed(2)}) indicates good course grasp.`,
    },
    {
      feature: 'backlog_count',
      label: 'Active Backlogs',
      value: backlog_count,
      unit: 'courses',
      shap_value: Math.round((backlogPenalty * 0.16) * 1000) / 1000,
      abs_impact: Math.round((backlogPenalty * 0.16) * 1000) / 1000,
      is_risk_driver: backlog_count > 0,
      explanation:
        backlog_count > 0
          ? `${backlog_count} uncleared course backlog(s) elevating risk of delayed progression.`
          : 'Zero active course backlogs.',
    },
    {
      feature: 'assignment_miss_rate',
      label: 'Assignment Non-Submission Rate',
      value: Math.round(assignment_miss_rate * 100),
      unit: '%',
      shap_value: Math.round((assignmentPenalty * 0.10) * 1000) / 1000,
      abs_impact: Math.round((assignmentPenalty * 0.10) * 1000) / 1000,
      is_risk_driver: assignment_miss_rate > 0.2,
      explanation:
        assignment_miss_rate > 0.2
          ? `High rate of missed LMS assignments (${Math.round(assignment_miss_rate * 100)}%).`
          : 'Consistent submission of digital course deliverables.',
    },
    {
      feature: 'lms_time_spent',
      label: 'Weekly LMS Study Time',
      value: Math.round(lms_time_spent),
      unit: 'mins/wk',
      shap_value: Math.round((lmsPenalty * 0.05) * 1000) / 1000,
      abs_impact: Math.round((lmsPenalty * 0.05) * 1000) / 1000,
      is_risk_driver: lms_time_spent < 120,
      explanation:
        lms_time_spent < 120
          ? `Low online study engagement (${Math.round(lms_time_spent)} mins/week).`
          : 'Regular and active digital portal interaction.',
    },
  ];

  const topFactors = [...candidateFactors]
    .sort((a, b) => b.abs_impact - a.abs_impact)
    .slice(0, 4);

  return {
    score,
    level,
    topFactors,
    allFactors: candidateFactors,
    engine: 'RULE_BASED',
    modelVersion: 'rule-based-v1',
  };
}

module.exports = { computeFallbackRiskScore };

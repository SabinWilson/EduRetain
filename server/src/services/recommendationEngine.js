/**
 * Intelligent Intervention Recommendation Engine
 * Generates tailored intervention suggestions based on top SHAP / rule-based risk factors.
 */

function generateRecommendations(student, topFactors, currentScore) {
  const recommendations = [];

  const seenTypes = new Set();

  for (const factor of topFactors) {
    if (!factor.is_risk_driver && factor.shap_value <= 0) continue;

    const feature = factor.feature;

    if (feature === 'avg_attendance' || feature === 'attendance_trend') {
      const type = 'Attendance Counselling Meeting';
      if (!seenTypes.has(type)) {
        seenTypes.add(type);
        recommendations.push({
          type,
          description: `Schedule a 1-on-1 attendance counselling session. Attendance has dropped to ${factor.value}${factor.unit || '%'}, requiring formal attendance recovery contract.`,
          targetRiskFactor: feature,
          priority: factor.abs_impact > 0.08 ? 'High' : 'Medium',
          recommendedBySystem: true,
          rationales: factor.explanation,
        });
      }
    } else if (feature === 'avg_gpa' || feature === 'gpa_trend') {
      const type = 'Peer Tutoring / Remedial Classes';
      if (!seenTypes.has(type)) {
        seenTypes.add(type);
        recommendations.push({
          type,
          description: `Enroll in department peer tutoring and subject remedial clinics. GPA trajectory (${factor.value}) requires academic concept reinforcement.`,
          targetRiskFactor: feature,
          priority: factor.abs_impact > 0.08 ? 'High' : 'Medium',
          recommendedBySystem: true,
          rationales: factor.explanation,
        });
      }
    } else if (feature === 'backlog_count') {
      const type = 'Academic Recovery Plan';
      if (!seenTypes.has(type)) {
        seenTypes.add(type);
        recommendations.push({
          type,
          description: `Formulate an Academic Recovery Plan for ${factor.value} active course backlogs, balancing prerequisite credit clearance with current term coursework.`,
          targetRiskFactor: feature,
          priority: 'High',
          recommendedBySystem: true,
          rationales: factor.explanation,
        });
      }
    } else if (
      feature === 'assignment_miss_rate' ||
      feature === 'lms_login_frequency' ||
      feature === 'lms_time_spent' ||
      feature === 'engagement_trend'
    ) {
      const type = 'Mentor Check-in and Engagement Nudge';
      if (!seenTypes.has(type)) {
        seenTypes.add(type);
        recommendations.push({
          type,
          description: `Initiate proactive mentor check-in regarding LMS course portal activity. Check for technical barriers or study habits contributing to low online engagement.`,
          targetRiskFactor: feature,
          priority: 'Medium',
          recommendedBySystem: true,
          rationales: factor.explanation,
        });
      }
    }
  }

  // If score is high but no specific factor matched (rare), add general guidance
  if (recommendations.length === 0 && currentScore >= 0.5) {
    recommendations.push({
      type: 'General Academic Guidance',
      description: 'Comprehensive retention advisory meeting to assess holistic academic standing, personal factors, and campus resource connections.',
      targetRiskFactor: 'overall_score',
      priority: 'High',
      recommendedBySystem: true,
      rationales: `Overall dropout risk score is elevated at ${(currentScore * 100).toFixed(1)}%.`,
    });
  }

  return recommendations;
}

module.exports = { generateRecommendations };

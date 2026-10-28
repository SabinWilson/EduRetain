require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { connectDB, closeDB } = require('../config/db');
const {
  User,
  Student,
  Attendance,
  Grade,
  LMSActivity,
  RiskScore,
  Alert,
  Intervention,
  ModelMeta,
  SystemConfig,
} = require('../models');
const { computeFallbackRiskScore } = require('../services/fallbackScorer');

const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Arjun', 'Bhavya', 'Chetan', 'Deepika',
  'Dev', 'Divya', 'Gaurav', 'Ishaan', 'Kavya', 'Manish', 'Neha', 'Nikhil',
  'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rhea', 'Rohan', 'Sakshi', 'Sameer',
  'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Tanvi', 'Tarun', 'Varun', 'Vidya',
  'Zara', 'Ayush', 'Meera', 'Karan', 'Simran', 'Vikram', 'Ritu', 'Harsh'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Singh',
  'Rao', 'Kumar', 'Das', 'Chatterjee', 'Mehta', 'Joshi', 'Bose', 'Menon',
  'Deshmukh', 'Chopra', 'Malhotra', 'Bhat', 'Pillai', 'Sengupta', 'Saxena'
];

const SUBJECTS_BY_DEPT = {
  'Computer Science': [
    'Data Structures & Algorithms',
    'Database Management Systems',
    'Operating Systems',
    'Computer Networks',
    'Software Engineering',
  ],
  'Information Technology': [
    'Web Architecture',
    'Cloud Computing',
    'Network Security',
    'Information Retrieval',
    'Mobile Application Development',
  ],
  'Electronics & Communication': [
    'Signals and Systems',
    'Digital Signal Processing',
    'VLSI Design',
    'Microprocessors',
    'Communication Systems',
  ],
  'Mechanical Engineering': [
    'Thermodynamics',
    'Fluid Mechanics',
    'Machine Design',
    'Heat Transfer',
    'Manufacturing Technology',
  ],
  'Data Science': [
    'Machine Learning',
    'Statistical Modeling',
    'Big Data Analytics',
    'Deep Learning',
    'Data Visualization',
  ],
};

const DEPARTMENTS = Object.keys(SUBJECTS_BY_DEPT);

async function seedDatabase(options = {}) {
  const force = options.force || process.argv.includes('--force');
  const closeOnFinish = options.closeOnFinish !== undefined ? options.closeOnFinish : true;

  console.log('--- Starting EduRetain Database Seeder ---');
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Check if data already exists
  const existingUserCount = await User.countDocuments();
  if (existingUserCount > 0 && !force) {
    console.log(`[Seed] Database already contains data (${existingUserCount} users exist). Skipping seeding.`);
    console.log('[Seed] To force re-seeding, pass --force or clear the database.');
    if (closeOnFinish) {
      await closeDB();
      process.exit(0);
    }
    return;
  }

  // Clear existing collections
  console.log('[Seed] Clearing existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Attendance.deleteMany({}),
    Grade.deleteMany({}),
    LMSActivity.deleteMany({}),
    RiskScore.deleteMany({}),
    Alert.deleteMany({}),
    Intervention.deleteMany({}),
    ModelMeta.deleteMany({}),
    SystemConfig.deleteMany({}),
  ]);

  // 1. Seed System Configuration
  console.log('[Seed] Initializing System Configuration...');
  const systemConfig = await SystemConfig.create({
    key: 'risk_config',
    lowMediumThreshold: 0.35,
    mediumHighThreshold: 0.65,
    emailAlertsEnabled: false,
    alertRecipientsEmail: 'mentor-alerts@institution.edu',
  });

  // 2. Seed Model Metadata (from ml-service metadata if exists, else defaults)
  console.log('[Seed] Seeding Model Metadata...');
  const mlMetaPath = path.join(__dirname, '../../../ml-service/models/metadata.json');
  let mlMeta = null;
  if (fs.existsSync(mlMetaPath)) {
    try {
      mlMeta = JSON.parse(fs.readFileSync(mlMetaPath, 'utf8'));
    } catch (e) {
      console.warn('[Seed] Could not parse ml-service metadata.json');
    }
  }

  await ModelMeta.create({
    version: mlMeta ? mlMeta.version : 'v20260928.180932',
    metrics: mlMeta ? mlMeta.metrics : {
      accuracy: 0.9591,
      precision: 0.8530,
      recall: 0.8788,
      f1: 0.8657,
      roc_auc: 0.9904,
      confusion_matrix: {
        true_negative: 364,
        false_positive: 10,
        false_negative: 8,
        true_positive: 58,
        matrix: [[364, 10], [8, 58]],
      },
    },
    featureList: mlMeta ? mlMeta.feature_list : [
      'avg_attendance', 'attendance_trend', 'avg_gpa', 'gpa_trend',
      'backlog_count', 'assignment_miss_rate', 'lms_login_frequency',
      'lms_time_spent', 'engagement_trend', 'semester', 'year'
    ],
    featureImportances: mlMeta ? mlMeta.feature_importances : [
      { feature: 'avg_gpa', label: 'Cumulative GPA', importance: 0.28 },
      { feature: 'avg_attendance', label: 'Average Attendance', importance: 0.24 },
      { feature: 'backlog_count', label: 'Active Course Backlogs', importance: 0.16 },
      { feature: 'assignment_miss_rate', label: 'Assignment Non-Submission Rate', importance: 0.12 },
      { feature: 'lms_time_spent', label: 'Weekly LMS Study Time', importance: 0.08 },
    ],
    totalSamples: mlMeta ? mlMeta.total_samples : 2200,
    testSamples: mlMeta ? mlMeta.test_samples : 440,
    dropoutRate: mlMeta ? mlMeta.dropout_rate : 0.15,
    isActive: true,
  });

  // 3. Seed Admin
  console.log('[Seed] Creating Administrator account...');
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@eduretain.com').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const adminPasswordHash = await User.hashPassword(adminPassword);
  const admin = await User.create({
    name: process.env.ADMIN_NAME || 'System Administrator',
    email: adminEmail,
    passwordHash: adminPasswordHash,
    role: 'admin',
    department: 'Academic Administration',
    isActive: true,
  });

  const seedDemoData = process.env.SEED_DEMO_DATA === 'true' || options.seedDemo === true;
  if (!seedDemoData) {
    console.log('--- Database Initialization Completed Successfully ---');
    console.log(`Summary:`);
    console.log(`- 1 Administrator account created (${adminEmail})`);
    console.log(`- Demo mentors and students skipped (SEED_DEMO_DATA is not 'true').`);
    if (closeOnFinish) {
      await closeDB();
      process.exit(0);
    }
    return;
  }

  // 4. Seed Mentors (5 mentors for development demo)
  console.log('[Seed] SEED_DEMO_DATA=true detected. Seeding 5 Faculty Mentors...');
  const mentorPasswordHash = await User.hashPassword('Mentor@123');
  const mentorConfigs = [
    { name: 'Dr. Alan Turing', email: 'mentor.cs@institution.edu', dept: 'Computer Science' },
    { name: 'Dr. Grace Hopper', email: 'mentor.it@institution.edu', dept: 'Information Technology' },
    { name: 'Dr. Claude Shannon', email: 'mentor.ece@institution.edu', dept: 'Electronics & Communication' },
    { name: 'Dr. Nikola Tesla', email: 'mentor.mech@institution.edu', dept: 'Mechanical Engineering' },
    { name: 'Dr. Ada Lovelace', email: 'mentor.ds@institution.edu', dept: 'Data Science' },
  ];

  const mentors = [];
  for (const mc of mentorConfigs) {
    const mentor = await User.create({
      name: mc.name,
      email: mc.email,
      passwordHash: mentorPasswordHash,
      role: 'mentor',
      department: mc.dept,
      isActive: true,
    });
    mentors.push(mentor);
  }

  // 5. Seed ~200 Students
  console.log('[Seed] Creating ~200 diverse students with full histories...');
  const studentPasswordHash = await User.hashPassword('Student@123');
  const totalStudentsTarget = 200;


  const months = ['August', 'September', 'October', 'November'];
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;

  for (let i = 1; i <= totalStudentsTarget; i++) {
    const dept = DEPARTMENTS[i % DEPARTMENTS.length];
    const mentor = mentors[i % mentors.length];

    const firstName = FIRST_NAMES[(i * 7) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 11) % LAST_NAMES.length];
    const name = `${firstName} ${lastName}`;
    const rollNo = `STU-2024-${String(i).padStart(4, '0')}`;
    const email = i === 1 ? 'student1@eduretain.com' : `student.${i}@institution.edu`;

    const year = (i % 4) + 1;
    const semester = (year * 2) - (i % 2);

    // Determine target risk category to ensure ~18% High, ~27% Medium, ~55% Low
    let targetProfile = 'Low';
    if (i === 1) {
      targetProfile = 'Medium'; // student1 is medium risk with clear early warning signals
    } else if (i % 5 === 0) {
      targetProfile = 'High'; // 20%
    } else if (i % 3 === 0) {
      targetProfile = 'Medium'; // ~26%
    }

    // Characteristics based on target profile
    let baseAttendance, attTrend, baseGpa, gpaTrend, backlogs, missRate, lmsHours, lmsLogins;

    if (targetProfile === 'High') {
      baseAttendance = 45 + Math.random() * 22; // 45% - 67%
      attTrend = -(5 + Math.random() * 15);
      baseGpa = 3.5 + Math.random() * 2.2; // 3.5 - 5.7
      gpaTrend = -(0.4 + Math.random() * 1.2);
      backlogs = Math.floor(1 + Math.random() * 4); // 1 to 4 backlogs
      missRate = 0.35 + Math.random() * 0.40; // 35% to 75%
      lmsHours = 15 + Math.random() * 45; // 15 to 60 mins/wk
      lmsLogins = 1 + Math.random() * 3;
    } else if (targetProfile === 'Medium') {
      baseAttendance = 68 + Math.random() * 10; // 68% - 78%
      attTrend = -(1 + Math.random() * 6);
      baseGpa = 5.8 + Math.random() * 1.2; // 5.8 - 7.0
      gpaTrend = -(0.1 + Math.random() * 0.4);
      backlogs = Math.random() > 0.6 ? 1 : 0;
      missRate = 0.15 + Math.random() * 0.15;
      lmsHours = 70 + Math.random() * 80;
      lmsLogins = 4 + Math.random() * 4;
    } else {
      // Low risk
      baseAttendance = 80 + Math.random() * 18; // 80% - 98%
      attTrend = (Math.random() * 8) - 2;
      baseGpa = 7.4 + Math.random() * 2.4; // 7.4 - 9.8
      gpaTrend = (Math.random() * 0.6) - 0.1;
      backlogs = 0;
      missRate = Math.random() * 0.10;
      lmsHours = 180 + Math.random() * 200;
      lmsLogins = 8 + Math.random() * 12;
    }

    const user = await User.create({
      name,
      email,
      passwordHash: studentPasswordHash,
      role: 'student',
      department: dept,
      isActive: true,
    });

    const student = await Student.create({
      user: user._id,
      rollNo,
      department: dept,
      program: i % 10 === 0 ? 'PG' : 'UG',
      year,
      semester,
      mentor: mentor._id,
      gender: i % 2 === 0 ? 'Female' : 'Male',
      admissionYear: 2024 - (year - 1),
      academicStatus: 'Active',
      currentRiskLevel: 'Uncomputed',
      currentRiskScore: 0,
    });

    // Seed Attendance records
    const deptSubjects = SUBJECTS_BY_DEPT[dept] || SUBJECTS_BY_DEPT['Computer Science'];
    for (const subj of deptSubjects.slice(0, 4)) {
      for (let m = 0; m < months.length; m++) {
        const monthAtt = Math.min(100, Math.max(30, Math.round(baseAttendance + (m * (attTrend / months.length)) + (Math.random() * 6 - 3))));
        await Attendance.create({
          student: student._id,
          subject: subj,
          month: months[m],
          percentage: monthAtt,
          totalClasses: 28,
          attendedClasses: Math.round((monthAtt / 100) * 28),
        });
      }
    }

    // Seed Grade records
    for (let s = 1; s <= semester; s++) {
      for (const subj of deptSubjects.slice(0, 3)) {
        const hasBacklog = (s === semester && backlogs > 0 && Math.random() > 0.4);
        const subGpa = hasBacklog ? 3.0 : Math.min(10, Math.max(4.0, Math.round((baseGpa + (s * (gpaTrend / semester)) + (Math.random() * 0.8 - 0.4)) * 10) / 10));
        await Grade.create({
          student: student._id,
          subject: `${subj} (Sem ${s})`,
          semester: s,
          internalMarks: Math.round(subGpa * 9.5),
          examMarks: Math.round(subGpa * 9.2),
          gpa: subGpa,
          backlog: hasBacklog,
        });
      }
    }

    // Seed LMSActivity records (Weeks 1 to 10)
    for (let w = 1; w <= 10; w++) {
      const weeklyMinutes = Math.max(10, Math.round(lmsHours + (Math.random() * 20 - 10)));
      const weeklyLogins = Math.max(1, Math.round(lmsLogins + (Math.random() * 2 - 1)));
      const submitted = Math.max(0, Math.round(3 * (1 - missRate)));
      const missed = Math.max(0, 3 - submitted);
      await LMSActivity.create({
        student: student._id,
        week: w,
        logins: weeklyLogins,
        assignmentsSubmitted: submitted,
        assignmentsMissed: missed,
        timeSpentMinutes: weeklyMinutes,
      });
    }

    // Compute initial RiskScore using rule engine for fast, consistent seeding
    const features = {
      avg_attendance: baseAttendance,
      attendance_trend: attTrend,
      avg_gpa: baseGpa,
      gpa_trend: gpaTrend,
      backlog_count: backlogs,
      assignment_miss_rate: missRate,
      lms_login_frequency: lmsLogins,
      lms_time_spent: lmsHours,
      engagement_trend: attTrend * 1.5,
      semester,
      year,
    };

    const scored = computeFallbackRiskScore(features, { lowMedium: 0.35, mediumHigh: 0.65 });

    // Save previous risk score (1 month ago) to give trend chart historical depth
    const prevScore = Math.max(0.05, Math.min(0.95, scored.score + (scored.level === 'High' ? -0.15 : 0.05)));
    await RiskScore.create({
      student: student._id,
      score: prevScore,
      level: prevScore >= 0.65 ? 'High' : prevScore >= 0.35 ? 'Medium' : 'Low',
      topFactors: scored.topFactors,
      engine: 'ML_MODEL',
      modelVersion: 'v20260928.180932',
      computedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    // Save current risk score
    await RiskScore.create({
      student: student._id,
      score: scored.score,
      level: scored.level,
      topFactors: scored.topFactors,
      allFactors: scored.allFactors,
      engine: 'ML_MODEL',
      modelVersion: 'v20260928.180932',
      computedAt: new Date(),
    });

    student.currentRiskScore = scored.score;
    student.currentRiskLevel = scored.level;
    await student.save();

    if (scored.level === 'High') highRiskCount++;
    else if (scored.level === 'Medium') mediumRiskCount++;
    else lowRiskCount++;

    // Generate alerts for High Risk students
    if (scored.level === 'High') {
      await Alert.create({
        student: student._id,
        mentor: mentor._id,
        type: 'HIGH_RISK_THRESHOLD',
        message: `High dropout risk alert: ${name} (${rollNo}) has scored ${(scored.score * 100).toFixed(1)}%. Primary factor: ${scored.topFactors[0]?.explanation || 'Low attendance'}`,
        level: 'High',
        score: scored.score,
        previousScore: prevScore,
        isRead: i % 2 === 0,
        createdAt: new Date(Date.now() - (i % 5) * 24 * 60 * 60 * 1000),
      });

      // Also log sample interventions
      if (i % 2 === 0) {
        await Intervention.create({
          student: student._id,
          mentor: mentor._id,
          type: scored.topFactors[0]?.feature.includes('attendance')
            ? 'Attendance Counselling Meeting'
            : scored.topFactors[0]?.feature.includes('gpa')
            ? 'Peer Tutoring / Remedial Classes'
            : 'Academic Recovery Plan',
          description: `Early intervention logged based on system recommendation: ${scored.topFactors[0]?.explanation}`,
          recommendedBySystem: true,
          targetRiskFactor: scored.topFactors[0]?.feature || 'avg_attendance',
          status: i % 4 === 0 ? 'Completed' : 'In Progress',
          outcomeNotes: i % 4 === 0 ? 'Student attended session; agreed to attendance recovery contract.' : '',
          preInterventionScore: scored.score,
          postInterventionScore: i % 4 === 0 ? Math.max(0.2, scored.score - 0.18) : null,
          scoreDelta: i % 4 === 0 ? -0.18 : null,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedAt: i % 4 === 0 ? new Date() : null,
        });
      }
    }
  }

  console.log('--- Database Seeding Completed Successfully ---');
  console.log(`Summary:`);
  console.log(`- 1 Administrator account (${adminEmail})`);
  console.log(`- 5 Mentors across 5 departments`);
  console.log(`- ${totalStudentsTarget} Total Students seeded:`);
  console.log(`    High Risk:   ${highRiskCount} (${((highRiskCount / totalStudentsTarget) * 100).toFixed(1)}%)`);
  console.log(`    Medium Risk: ${mediumRiskCount} (${((mediumRiskCount / totalStudentsTarget) * 100).toFixed(1)}%)`);
  console.log(`    Low Risk:    ${lowRiskCount} (${((lowRiskCount / totalStudentsTarget) * 100).toFixed(1)}%)`);
  console.log('\n[Note] Users can now sign in with their registered credentials or Administrator credentials.');


  if (closeOnFinish) {
    await closeDB();
    process.exit(0);
  }
}

if (require.main === module) {
  seedDatabase().catch((err) => {
    console.error('[Seed Fatal Error]:', err);
    process.exit(1);
  });
}

module.exports = { seedDatabase };


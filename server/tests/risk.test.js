const request = require('supertest');
const app = require('../src/app');
const { User, Student, RiskScore, SystemConfig } = require('../src/models');
const { connectDB, closeDB } = require('../src/config/db');
const { computeFallbackRiskScore } = require('../src/services/fallbackScorer');

let adminToken;
let mentorToken;
let testStudent;

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({});
  await Student.deleteMany({});
  await RiskScore.deleteMany({});

  await SystemConfig.create({
    key: 'risk_config',
    lowMediumThreshold: 0.35,
    mediumHighThreshold: 0.65,
  });

  const hash = await User.hashPassword('Password@123');

  // Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin.test@institution.edu',
    passwordHash: hash,
    role: 'admin',
    department: 'Administration',
    isActive: true,
  });

  // Mentor
  const mentor = await User.create({
    name: 'Mentor User',
    email: 'mentor.test@institution.edu',
    passwordHash: hash,
    role: 'mentor',
    department: 'Computer Science',
    isActive: true,
  });

  // Student
  const stuUser = await User.create({
    name: 'Student User',
    email: 'student.test@institution.edu',
    passwordHash: hash,
    role: 'student',
    department: 'Computer Science',
    isActive: true,
  });

  testStudent = await Student.create({
    user: stuUser._id,
    rollNo: 'TEST-001',
    department: 'Computer Science',
    program: 'UG',
    year: 2,
    semester: 3,
    mentor: mentor._id,
    currentRiskLevel: 'High',
    currentRiskScore: 0.78,
  });

  await RiskScore.create({
    student: testStudent._id,
    score: 0.78,
    level: 'High',
    topFactors: [
      {
        feature: 'avg_attendance',
        label: 'Average Attendance',
        value: 52.0,
        unit: '%',
        shap_value: 0.08,
        abs_impact: 0.08,
        is_risk_driver: true,
        explanation: 'Low attendance is raising risk.',
      },
    ],
    computedAt: new Date(),
  });

  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin.test@institution.edu', password: 'Password@123' });
  adminToken = adminLogin.body.token;

  const mentorLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mentor.test@institution.edu', password: 'Password@123' });
  mentorToken = mentorLogin.body.token;
});

afterAll(async () => {
  await closeDB();
});

describe('Risk API Endpoints & Scorer', () => {
  it('should compute fallback risk score with weighted rule engine', () => {
    const highRiskFeatures = {
      avg_attendance: 50.0,
      attendance_trend: -15.0,
      avg_gpa: 4.0,
      gpa_trend: -0.8,
      backlog_count: 3,
      assignment_miss_rate: 0.5,
      lms_login_frequency: 2,
      lms_time_spent: 30,
      engagement_trend: -20,
      semester: 3,
      year: 2,
    };

    const result = computeFallbackRiskScore(highRiskFeatures);
    expect(result.score).toBeGreaterThanOrEqual(0.65);
    expect(result.level).toBe('High');
    expect(result.topFactors.length).toBeGreaterThan(0);
    expect(result.topFactors[0].explanation).toBeDefined();
  });

  it('should return dashboard summary for authorized mentor', async () => {
    const res = await request(app)
      .get('/api/risk/dashboard-summary')
      .set('Authorization', `Bearer ${mentorToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.totalStudents).toBe(1);
    expect(res.body.summary.highRiskCount).toBe(1);
    expect(res.body.distribution).toBeDefined();
    expect(res.body.trendData).toBeDefined();
  });

  it('should recompute risk for a student via POST /api/risk/recompute', async () => {
    const res = await request(app)
      .post('/api/risk/recompute')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ studentId: testStudent._id });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.recomputedCount).toBe(1);
    expect(res.body.data.score).toBeDefined();
    expect(res.body.data.level).toBeDefined();
  });
});

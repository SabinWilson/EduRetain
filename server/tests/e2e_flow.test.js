const request = require('supertest');
const app = require('../src/app');
const { User, Student, SystemConfig, RiskScore } = require('../src/models');
const { connectDB, closeDB } = require('../src/config/db');

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({});
  await Student.deleteMany({});
  await SystemConfig.deleteMany({});

  await SystemConfig.create({
    key: 'risk_config',
    lowMediumThreshold: 0.35,
    mediumHighThreshold: 0.65,
  });

  // Seed Initial Admin using env credentials
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@eduretain.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  const hash = await User.hashPassword(adminPassword);
  await User.create({
    name: 'Dr. Administrator',
    email: adminEmail,
    passwordHash: hash,
    role: 'admin',
    department: 'Academic Administration',
    isActive: true,
  });
});

afterAll(async () => {
  await closeDB();
});

describe('End-to-End Production Authentication & RBAC Verification', () => {
  let adminToken;
  let mentorUserId;
  let mentorToken;
  let studentToken;

  it('1. Admin logs in using env credentials and accesses admin resources', async () => {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@eduretain.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';

    const loginRes = await request(app).post('/api/auth/login').send({
      email: adminEmail,
      password: adminPassword,
    });

    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.user.role).toBe('admin');
    adminToken = loginRes.body.token;

    // Verify Admin can access /api/admin/users
    const usersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.statusCode).toBe(200);
    expect(usersRes.body.success).toBe(true);

    // Verify Admin can access /api/admin/thresholds
    const thresholdRes = await request(app)
      .get('/api/admin/thresholds')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(thresholdRes.statusCode).toBe(200);
  });

  it('2. Register mentor following approval policy -> pending -> admin approves -> mentor logs in', async () => {
    // A. Register Mentor
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Dr. Grace Hopper',
      email: 'grace.hopper@institution.edu',
      password: 'SecureMentorPass1',
      confirmPassword: 'SecureMentorPass1',
      role: 'mentor',
      department: 'Computer Science',
    });

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.user.isActive).toBe(false);
    expect(regRes.body.user.role).toBe('mentor');
    mentorUserId = regRes.body.user.id;

    // B. Mentor attempts to log in before approval -> 403 Forbidden
    const unapprovedLogin = await request(app).post('/api/auth/login').send({
      email: 'grace.hopper@institution.edu',
      password: 'SecureMentorPass1',
    });
    expect(unapprovedLogin.statusCode).toBe(403);
    expect(unapprovedLogin.body.message).toContain('pending administrator approval');

    // C. Admin views pending mentors on Users page
    const pendingListRes = await request(app)
      .get('/api/admin/users?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pendingListRes.statusCode).toBe(200);
    expect(pendingListRes.body.pendingCount).toBeGreaterThanOrEqual(1);

    // D. Admin approves mentor account (toggles status to active)
    const approveRes = await request(app)
      .patch(`/api/admin/users/${mentorUserId}/toggle-status`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.data.isActive).toBe(true);

    // E. Mentor logs in successfully now that account is approved
    const approvedLogin = await request(app).post('/api/auth/login').send({
      email: 'grace.hopper@institution.edu',
      password: 'SecureMentorPass1',
    });
    expect(approvedLogin.statusCode).toBe(200);
    expect(approvedLogin.body.success).toBe(true);
    expect(approvedLogin.body.token).toBeDefined();
    mentorToken = approvedLogin.body.token;

    // F. Mentor accesses dashboard summary
    const mentorDash = await request(app)
      .get('/api/risk/dashboard-summary')
      .set('Authorization', `Bearer ${mentorToken}`);
    expect(mentorDash.statusCode).toBe(200);
    expect(mentorDash.body.success).toBe(true);
  });

  it('3. Register student -> auto-assigns approved mentor -> student logs in and accesses portal', async () => {
    // A. Register Student
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Charlie Student',
      email: 'charlie.student@institution.edu',
      password: 'SecureStudentPass1',
      confirmPassword: 'SecureStudentPass1',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-2024-0099',
      year: 2,
      semester: 4,
      program: 'UG',
    });

    expect(regRes.statusCode).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.token).toBeDefined();
    expect(regRes.body.user.role).toBe('student');
    studentToken = regRes.body.token;

    // Verify auto-assigned mentor is Dr. Grace Hopper (the CS mentor approved in previous step)
    const studentRecord = await Student.findOne({ rollNo: 'STU-2024-0099' });
    expect(studentRecord).toBeDefined();
    expect(studentRecord.mentor.toString()).toBe(mentorUserId.toString());

    // B. Student fetches their own profile via /api/auth/me
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.user.email).toBe('charlie.student@institution.edu');
    expect(meRes.body.user.studentId).toBeDefined();
    expect(meRes.body.user.rollNo).toBe('STU-2024-0099');

    // C. Student accesses their portal data
    const studentDataRes = await request(app)
      .get(`/api/students/${studentRecord._id}`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(studentDataRes.statusCode).toBe(200);
    expect(studentDataRes.body.success).toBe(true);
    expect(studentDataRes.body.data.rollNo).toBe('STU-2024-0099');
  });

  it('4. Security checks: role escalation rejection, wrong password, duplicate email, missing token', async () => {
    // A. Role escalation attempt (tampered role=admin)
    const escalateRes = await request(app).post('/api/auth/register').send({
      name: 'Hacker',
      email: 'hacker@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'admin',
      department: 'Computer Science',
    });
    expect(escalateRes.statusCode).toBe(400);

    // B. Wrong password rejection with generic message
    const wrongPassRes = await request(app).post('/api/auth/login').send({
      email: 'grace.hopper@institution.edu',
      password: 'IncorrectPassword',
    });
    expect(wrongPassRes.statusCode).toBe(401);
    expect(wrongPassRes.body.message).toBe('Invalid email or password');

    // C. Duplicate email registration rejection with 409
    const dupRes = await request(app).post('/api/auth/register').send({
      name: 'Another Charlie',
      email: 'charlie.student@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-2024-NEW1',
      year: 1,
      semester: 1,
    });
    expect(dupRes.statusCode).toBe(409);
    expect(dupRes.body.message).toContain('already exists');

    // D. Accessing protected dashboard without token -> 401
    const noTokenRes = await request(app).get('/api/risk/dashboard-summary');
    expect(noTokenRes.statusCode).toBe(401);
  });

  it('5. Session restoration (/api/auth/me) and logout (/api/auth/logout)', async () => {
    // Restore session on refresh
    const restoreRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${mentorToken}`);
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.body.user.role).toBe('mentor');

    // Logout
    const logoutRes = await request(app).post('/api/auth/logout');
    expect(logoutRes.statusCode).toBe(200);
    expect(logoutRes.body.success).toBe(true);
  });
});

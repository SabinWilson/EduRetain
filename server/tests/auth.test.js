const request = require('supertest');
const app = require('../src/app');
const { User, Student } = require('../src/models');
const { connectDB, closeDB } = require('../src/config/db');

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({});
  await Student.deleteMany({});

  // Seed active test mentor for department CS
  const hash = await User.hashPassword('Password@123');
  await User.create({
    name: 'Test Mentor',
    email: 'test.mentor@institution.edu',
    passwordHash: hash,
    role: 'mentor',
    department: 'Computer Science',
    isActive: true,
  });
});

afterAll(async () => {
  await closeDB();
});

describe('Authentication API Endpoints', () => {
  it('should reject login with missing credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject login with wrong password without revealing email existence', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test.mentor@institution.edu',
      password: 'WrongPassword',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should reject login for non-existent email with generic error', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@institution.edu',
      password: 'Password@123',
    });
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('should successfully log in with valid credentials and return JWT token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test.mentor@institution.edu',
      password: 'Password@123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('mentor');
  });

  it('should fetch own profile using Bearer token with /api/auth/me', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'test.mentor@institution.edu',
      password: 'Password@123',
    });
    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.email).toBe('test.mentor@institution.edu');
  });

  it('should reject /api/auth/me when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should register a new student, create linked Student record, and auto-assign mentor', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Student',
      email: 'alice.student@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-2024-TEST1',
      year: 2,
      semester: 3,
      program: 'UG',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.rollNo).toBe('STU-2024-TEST1');

    // Verify student document in DB and auto-assigned mentor
    const studentRecord = await Student.findOne({ rollNo: 'STU-2024-TEST1' });
    expect(studentRecord).toBeDefined();
    expect(studentRecord.mentor).toBeDefined();
    const assignedMentor = await User.findById(studentRecord.mentor);
    expect(assignedMentor).toBeDefined();
    expect(assignedMentor.email).toBe('test.mentor@institution.edu');
  });


  it('should register a faculty mentor with isActive=false pending approval', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Dr. New Mentor',
      email: 'new.mentor@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'mentor',
      department: 'Computer Science',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.isActive).toBe(false);
    expect(res.body.token).toBeUndefined(); // No token issued until approved

    // Attempting login before approval must be rejected with 403
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'new.mentor@institution.edu',
      password: 'SecurePassword1',
    });
    expect(loginRes.statusCode).toBe(403);
    expect(loginRes.body.message).toContain('pending administrator approval');
  });

  it('should strictly reject role escalation attempt (role=admin in registration)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attacker Admin',
      email: 'attacker@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'admin',
      department: 'Academic Administration',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration with duplicate email with 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Alice',
      email: 'alice.student@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-2024-DIFF',
      year: 1,
      semester: 1,
      program: 'UG',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should reject student registration with duplicate roll number with 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Bob Student',
      email: 'bob.student@institution.edu',
      password: 'SecurePassword1',
      confirmPassword: 'SecurePassword1',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-2024-TEST1', // Already taken by Alice
      year: 1,
      semester: 1,
      program: 'UG',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('roll number');
  });

  it('should reject registration if password does not meet complexity requirements', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Weak Pass',
      email: 'weakpass@institution.edu',
      password: 'weak', // Less than 8 chars, missing uppercase and number
      confirmPassword: 'weak',
      role: 'student',
      department: 'Computer Science',
      rollNo: 'STU-WEAK-01',
      year: 1,
      semester: 1,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully logout via /api/auth/logout', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Hash,
  BookOpen,
  UserCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Mechanical Engineering',
  'Data Science',
];

export default function RegisterPage() {
  const [role, setRole] = useState('student'); // 'student' | 'mentor'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Student specific
  const [rollNo, setRollNo] = useState('');
  const [department, setDepartment] = useState('Computer Science');
  const [year, setYear] = useState('1');
  const [semester, setSemester] = useState('1');
  const [program, setProgram] = useState('UG');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mentorSubmitted, setMentorSubmitted] = useState(false);
  const [touched, setTouched] = useState({});

  const { user, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to appropriate home
  useEffect(() => {
    if (user) {
      navigate(user.role === 'student' ? '/portal' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Real-time password requirement checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email.trim().length > 0 && emailRegex.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Mark all as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      rollNo: true,
    });

    if (!name.trim() || name.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    if (!isEmailValid) {
      setError('Please provide a valid institutional email address.');
      return;
    }
    if (!isPasswordValid) {
      setError('Password does not meet the security requirements.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    if (role === 'student') {
      if (!rollNo.trim() || rollNo.trim().length < 2) {
        setError('A valid student roll number is required.');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        role,
        department,
      };

      if (role === 'student') {
        payload.rollNo = rollNo.trim().toUpperCase();
        payload.year = parseInt(year, 10);
        payload.semester = parseInt(semester, 10);
        payload.program = program;
      }

      const res = await register(payload, true);

      if (role === 'student') {
        // Automatically authenticated and redirected
        navigate('/portal', { replace: true });
      } else {
        // Mentor registration submitted for approval
        setMentorSubmitted(true);
      }
    } catch (err) {
      if (!err.response) {
        setError('Network error: Unable to connect to EduRetain servers. Please try again.');
      } else if (err.response.status === 409) {
        setError(err.response.data?.message || 'An account with these details already exists.');
      } else if (err.response.status === 400 && err.response.data?.errors) {
        const firstIssue = err.response.data.errors[0]?.message;
        setError(firstIssue || 'Validation failed. Please review the form fields.');
      } else {
        setError(err.response.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F2D2A 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '40px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Teal Glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 580,
          height: 580,
          background: 'rgba(0, 168, 150, 0.12)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 520, width: '100%', zIndex: 10, textAlign: 'center' }}>
        {/* Brand Header */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, #00A896 0%, #028090 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(0, 168, 150, 0.35)',
            marginBottom: 16,
          }}
        >
          <GraduationCap size={30} />
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.5px',
            margin: '0 0 6px',
          }}
        >
          EduRetain
        </h1>

        <p style={{ color: 'rgba(255, 255, 255, 0.72)', fontSize: 14, margin: '0 auto 28px' }}>
          Create an institutional account for predictive academic retention
        </p>

        {/* Card Content */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            padding: '36px 32px',
            boxShadow: 'var(--shadow-modal)',
            textAlign: 'left',
          }}
        >
          {mentorSubmitted ? (
            <div style={{ textAlign: 'center', padding: '12px 6px' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'var(--color-amber-light)',
                  color: 'var(--color-amber-dark)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <Clock size={28} />
              </div>

              <h2
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  margin: '0 0 8px',
                }}
              >
                Registration Pending Approval
              </h2>

              <p style={{ fontSize: 13.5, color: 'var(--color-text)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Thank you, <strong>{name}</strong>. Your faculty mentor account for the{' '}
                <strong>{department}</strong> department has been submitted for administrator review.
              </p>

              <div
                style={{
                  background: 'var(--color-surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  padding: '14px 16px',
                  fontSize: 12.5,
                  color: 'var(--color-text-secondary)',
                  textAlign: 'left',
                  marginBottom: 24,
                  lineHeight: 1.5,
                }}
              >
                <strong>Security Policy Notice:</strong> To safeguard student academic and risk
                records, faculty mentor accounts require verification and activation by an EduRetain
                system administrator. You will be able to sign in once your account is approved.
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="rm-btn-primary"
                style={{ width: '100%', padding: '12px 20px', fontSize: 14 }}
              >
                <span>Return to Login</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: 22 }}>
                <h2
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--color-ink)',
                    margin: '0 0 4px',
                  }}
                >
                  Create Your Account
                </h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Select your role and complete the institutional verification fields
                </p>
              </div>

              {error && (
                <div className="rm-alert-error" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 13 }}>{error}</span>
                </div>
              )}

              {/* Role Selector Tabs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  marginBottom: 20,
                  background: 'var(--color-surface-subtle)',
                  padding: 4,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setRole('student');
                    setError('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: role === 'student' ? 'var(--color-surface)' : 'transparent',
                    color: role === 'student' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    boxShadow: role === 'student' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BookOpen size={16} />
                  <span>Student Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRole('mentor');
                    setError('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-xs)',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: role === 'mentor' ? 'var(--color-surface)' : 'transparent',
                    color: role === 'mentor' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    boxShadow: role === 'mentor' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <UserCheck size={16} />
                  <span>Faculty Mentor</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div className="rm-form-group">
                  <label className="rm-label" htmlFor="reg-name">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-name"
                      type="text"
                      required
                      value={name}
                      onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={role === 'student' ? 'e.g. John Doe' : 'e.g. Dr. Alan Turing'}
                      className="rm-input"
                      style={{ paddingLeft: 38 }}
                    />
                    <User
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                      }}
                    />
                  </div>
                </div>

                {/* Institutional Email */}
                <div className="rm-form-group">
                  <label className="rm-label" htmlFor="reg-email">Institutional Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-email"
                      type="email"
                      required
                      value={email}
                      onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={
                        role === 'student'
                          ? 'e.g. student.id@institution.edu'
                          : 'e.g. faculty.name@institution.edu'
                      }
                      className="rm-input"
                      style={{ paddingLeft: 38 }}
                    />
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                      }}
                    />
                  </div>
                </div>

                {/* Role Specific Fields */}
                {role === 'student' && (
                  <>
                    <div className="rm-row2">
                      <div className="rm-form-group">
                        <label className="rm-label" htmlFor="reg-rollno">Roll Number</label>
                        <div style={{ position: 'relative' }}>
                          <input
                            id="reg-rollno"
                            type="text"
                            required
                            value={rollNo}
                            onBlur={() => setTouched((prev) => ({ ...prev, rollNo: true }))}
                            onChange={(e) => setRollNo(e.target.value)}
                            placeholder="e.g. STU-2024-001"
                            className="rm-input"
                            style={{ paddingLeft: 36, textTransform: 'uppercase' }}
                          />
                          <Hash
                            size={15}
                            style={{
                              position: 'absolute',
                              left: 12,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              color: 'var(--color-text-muted)',
                            }}
                          />
                        </div>
                      </div>

                      <div className="rm-form-group">
                        <label className="rm-label" htmlFor="reg-program">Academic Program</label>
                        <select
                          id="reg-program"
                          value={program}
                          onChange={(e) => setProgram(e.target.value)}
                          className="rm-select"
                        >
                          <option value="UG">Undergraduate (UG)</option>
                          <option value="PG">Postgraduate (PG)</option>
                        </select>
                      </div>
                    </div>

                    <div className="rm-form-group">
                      <label className="rm-label" htmlFor="reg-dept">Department</label>
                      <select
                        id="reg-dept"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="rm-select"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rm-row2">
                      <div className="rm-form-group">
                        <label className="rm-label" htmlFor="reg-year">Year of Study</label>
                        <select
                          id="reg-year"
                          value={year}
                          onChange={(e) => {
                            const newYear = e.target.value;
                            setYear(newYear);
                            // Set default semester for that year
                            setSemester(String((parseInt(newYear, 10) * 2) - 1));
                          }}
                          className="rm-select"
                        >
                          <option value="1">1st Year</option>
                          <option value="2">2nd Year</option>
                          <option value="3">3rd Year</option>
                          <option value="4">4th Year</option>
                        </select>
                      </div>

                      <div className="rm-form-group">
                        <label className="rm-label" htmlFor="reg-semester">Semester</label>
                        <select
                          id="reg-semester"
                          value={semester}
                          onChange={(e) => setSemester(e.target.value)}
                          className="rm-select"
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                            <option key={s} value={s}>
                              Semester {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {role === 'mentor' && (
                  <>
                    <div className="rm-form-group">
                      <label className="rm-label" htmlFor="reg-mentor-dept">Department</label>
                      <select
                        id="reg-mentor-dept"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="rm-select"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      style={{
                        background: 'var(--color-amber-light)',
                        border: '1px solid rgba(217, 119, 6, 0.25)',
                        borderRadius: 'var(--radius-xs)',
                        padding: '10px 12px',
                        marginBottom: 18,
                        fontSize: 12,
                        color: 'var(--color-amber-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Clock size={16} style={{ flexShrink: 0 }} />
                      <span>
                        Faculty accounts require administrator approval before login is enabled.
                      </span>
                    </div>
                  </>
                )}

                {/* Password */}
                <div className="rm-form-group">
                  <label className="rm-label" htmlFor="reg-password">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password}
                      onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="rm-input"
                      style={{ paddingLeft: 38, paddingRight: 40 }}
                    />
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: 4,
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="rm-form-group">
                  <label className="rm-label" htmlFor="reg-confirmpassword">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="reg-confirmpassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="rm-input"
                      style={{ paddingLeft: 38, paddingRight: 40 }}
                    />
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-text-muted)',
                        padding: 4,
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Password Checklist */}
                <div
                  style={{
                    background: 'var(--color-surface-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '10px 12px',
                    marginBottom: 20,
                    fontSize: 11.5,
                    color: 'var(--color-text-secondary)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: hasMinLength ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={13} /> 8+ Characters
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: hasUppercase ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={13} /> 1 Uppercase Letter
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: hasLowercase ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={13} /> 1 Lowercase Letter
                  </span>
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      color: hasNumber ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    }}
                  >
                    <CheckCircle2 size={13} /> 1 Number
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="rm-btn-primary"
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: 14,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* Back to Login Link */}
              <div
                style={{
                  marginTop: 22,
                  paddingTop: 18,
                  borderTop: '1px solid var(--color-border)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', margin: 0 }}>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: 'var(--color-primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>
          Self-registration as administrator is disabled. Institutional audit logging enabled.
        </p>
      </div>
    </div>
  );
}

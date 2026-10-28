import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, Check } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already logged in, redirect to dashboard or student portal
  useEffect(() => {
    if (user) {
      const destination = location.state?.from?.pathname || (user.role === 'student' ? '/portal' : '/dashboard');
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailValid = email.trim().length > 0 && emailRegex.test(email.trim());
  const passwordValid = password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!emailValid) {
      setError('Please enter a valid institutional email address.');
      return;
    }
    if (!passwordValid) {
      setError('Password cannot be empty.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email.trim(), password, rememberMe);
      const destination =
        location.state?.from?.pathname ||
        (loggedInUser.role === 'student' ? '/portal' : '/dashboard');
      navigate(destination, { replace: true });
    } catch (err) {
      if (!err.response) {
        setError('Network error: Unable to reach EduRetain servers. Please check your connection.');
      } else if (err.response.status === 401) {
        setError('Invalid institutional email or password.');
      } else if (err.response.status === 403) {
        setError(err.response.data?.message || 'Your account is pending administrator approval or has been deactivated.');
      } else if (err.response.status === 429) {
        setError('Too many login attempts. Please wait 15 minutes before trying again.');
      } else {
        setError(err.response.data?.message || 'Authentication failed. Please verify your credentials.');
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
        padding: '30px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient Teal Glow */}
      <div
        style={{
          position: 'absolute',
          top: '25%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          height: 520,
          background: 'rgba(0, 168, 150, 0.14)',
          borderRadius: '50%',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: 440, width: '100%', zIndex: 10, textAlign: 'center' }}>
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
          AI-Powered Student Retention & Early Intervention System
        </p>

        {/* Clean Login Card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            padding: '36px 32px',
            boxShadow: 'var(--shadow-modal)',
            textAlign: 'left',
          }}
        >
          <div style={{ marginBottom: 22 }}>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-ink)',
                margin: '0 0 4px',
              }}
            >
              Sign In to Your Account
            </h2>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
              Enter your institutional credentials to access your retention dashboard
            </p>
          </div>

          {error && (
            <div className="rm-alert-error" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="rm-form-group">
              <label className="rm-label" htmlFor="login-email">Institutional Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="name@institution.edu"
                  className="rm-input"
                  style={{
                    paddingLeft: 38,
                    borderColor:
                      touched.email && !emailValid
                        ? 'var(--color-red)'
                        : undefined,
                  }}
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
              {touched.email && !emailValid && (
                <p style={{ color: 'var(--color-red)', fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>
                  Please enter a valid email address.
                </p>
              )}
            </div>

            <div className="rm-form-group">
              <label className="rm-label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your password"
                  className="rm-input"
                  style={{
                    paddingLeft: 38,
                    paddingRight: 40,
                    borderColor:
                      touched.password && !passwordValid
                        ? 'var(--color-red)'
                        : undefined,
                  }}
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
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {touched.password && !passwordValid && (
                <p style={{ color: 'var(--color-red)', fontSize: 12, marginTop: 4, margin: '4px 0 0' }}>
                  Password is required.
                </p>
              )}
            </div>

            {/* Remember Me */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  userSelect: 'none',
                  fontSize: 13,
                  color: 'var(--color-text)',
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'var(--color-primary)',
                    cursor: 'pointer',
                  }}
                />
                <span>Remember me on this device</span>
              </label>
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
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {/* Registration Navigation */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: '1px solid var(--color-border)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 13.5, color: 'var(--color-text-secondary)', margin: 0 }}>
              Don't have an account?{' '}
              <Link
                to="/register"
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255, 255, 255, 0.55)' }}>
          Secure Institutional Authentication • SHAP Explainability Engine
        </p>
      </div>
    </div>
  );
}

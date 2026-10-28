import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusPill from '../components/StatusPill';
import {
  Sparkles,
  BookOpen,
  CalendarCheck,
  Award,
  Clock,
  Mail,
  UserCheck,
  CheckCircle,
  Lightbulb,
  GraduationCap,
  RefreshCw,
  TrendingUp,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function StudentPortalPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyProfile = async () => {
      try {
        setLoading(true);
        const meRes = await api.get('/auth/me');
        if (meRes.data.success && meRes.data.user.studentProfile) {
          const studentId = meRes.data.user.studentProfile._id;
          const detailRes = await api.get(`/students/${studentId}/profile`);
          if (detailRes.data.success) {
            setProfileData(detailRes.data.data);
          }
        }
      } catch (err) {
        console.error('Error fetching student portal data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyProfile();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <RefreshCw size={28} className="animate-spin text-teal-600" style={{ margin: '0 auto 12px' }} />
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>Loading your academic profile...</p>
      </div>
    );
  }

  const student = profileData?.student || {};
  const summary = profileData?.summary || { avgAttendance: 85, avgGpa: 8.0, totalLmsHours: 24 };
  const attendance = profileData?.attendance || [];
  const grades = profileData?.grades || [];
  const mentor = student.mentor || {};

  const isSupportRecommended =
    (summary.avgAttendance && summary.avgAttendance < 75) ||
    (summary.avgGpa && summary.avgGpa < 6.0);

  const statusText = isSupportRecommended ? 'Academic Support Recommended' : 'On Track';

  const attendanceData = attendance.slice(-6).map((a) => ({
    subject: a.subject.length > 14 ? `${a.subject.slice(0, 14)}...` : a.subject,
    percentage: a.percentage,
  }));

  const gradesData = grades.slice(-6).map((g) => ({
    subject: g.subject.length > 14 ? `${g.subject.slice(0, 14)}...` : g.subject,
    gpa: g.gpa,
  }));

  return (
    <div>
      {/* Student Welcome Header Card (RentMate Hero Aesthetic with Teal Accent) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00A896 0%, #028090 60%, #05668D 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '30px 36px',
          color: '#FFFFFF',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 26,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.18)', padding: '3px 10px', borderRadius: 'var(--radius-full)', fontSize: 11.5, fontWeight: 700, marginBottom: 8, letterSpacing: '0.04em' }}>
            <Sparkles size={13} /> STUDENT ACADEMIC HUB
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p style={{ fontSize: 13.5, opacity: 0.9, marginTop: 4, marginBottom: 0 }}>
            {student.department || user?.department || 'Computer Science'} • Roll No: {student.rollNo || 'STU-2024-0001'} • Semester {student.semester || 4}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatusPill status={statusText} size="lg" />
        </div>
      </div>

      {/* RentMate Style Stat Row */}
      <div className="rm-stat-row">
        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Average Attendance</div>
            <div className="rm-stat-val" style={{ color: Number(summary.avgAttendance) < 75 ? 'var(--color-red)' : 'var(--color-ink)' }}>
              {summary.avgAttendance ? Number(summary.avgAttendance).toFixed(1) : 85.0}%
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Target: 75% minimum
            </div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <CalendarCheck size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Cumulative GPA</div>
            <div className="rm-stat-val">
              {summary.avgGpa ? Number(summary.avgGpa).toFixed(2) : 7.80}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Out of 10.0 scale
            </div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Award size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">LMS Study Engagement</div>
            <div className="rm-stat-val">
              {summary.totalLmsHours ? Number(summary.totalLmsHours).toFixed(1) : 28.5} hrs
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
              Recorded portal activity
            </div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Assigned Faculty Mentor</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', marginTop: 6 }}>
              {mentor.name || 'Not yet assigned'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--color-primary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Mail size={12} /> {mentor.email || 'Contact Academic Administration'}
            </div>

          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <UserCheck size={22} />
          </div>
        </div>
      </div>

      {/* Grid of Subject Performance & Mentor Advice */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 20 }}>
        {/* Attendance Breakdown Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={18} color="var(--color-primary)" />
            <span>Attendance by Subject</span>
          </h3>

          <div style={{ height: 240, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(value) => [`${value}%`, 'Attendance']} />
                <Bar dataKey="percentage" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GPA Breakdown Card */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 24, boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Award size={18} color="var(--color-primary)" />
            <span>Subject Grades & GPA</span>
          </h3>

          <div style={{ height: 240, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [value, 'Grade Point']} />
                <Bar dataKey="gpa" fill="#028090" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Proactive Mentor Support & Study Strategies Card */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          boxShadow: 'var(--shadow-sm)',
          marginTop: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lightbulb size={20} color="var(--color-primary)" />
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', margin: 0 }}>
                Personalized Learning & Mentorship Advice
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
                Recommendations based on your semester milestones
              </p>
            </div>
          </div>

          {mentor.email ? (
            <a
              href={`mailto:${mentor.email}?subject=Academic Mentorship Inquiry`}
              className="rm-btn-primary rm-btn-sm"
            >
              <Mail size={14} />
              <span>Contact Mentor</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="rm-btn-secondary rm-btn-sm"
              style={{ opacity: 0.6, cursor: 'default' }}
            >
              <Mail size={14} />
              <span>Mentor Unassigned</span>
            </button>
          )}
        </div>


        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <div style={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: 'var(--color-ink)', marginBottom: 4 }}>
              <CheckCircle size={15} color="var(--color-primary)" />
              Attendance Continuity
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              Attend morning lab lectures regularly. Department regulations require at least 75% attendance to qualify for term examinations.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: 'var(--color-ink)', marginBottom: 4 }}>
              <CheckCircle size={15} color="var(--color-primary)" />
              LMS Reading Modules
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              Keep up with weekly chapter summaries and practice problem sets posted by your course instructors on the portal.
            </p>
          </div>

          <div style={{ background: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 13, color: 'var(--color-ink)', marginBottom: 4 }}>
              <CheckCircle size={15} color="var(--color-primary)" />
              Office Hours & Remedials
            </div>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: 0 }}>
              Schedule 1-on-1 consultations during your mentor's open office hours whenever tackling challenging conceptual topics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

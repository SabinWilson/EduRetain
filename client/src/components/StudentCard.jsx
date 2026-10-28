import React from 'react';
import { ArrowRight, BookOpen, AlertTriangle, CheckCircle, Clock, Calendar, ChevronRight, Activity, TrendingDown, TrendingUp } from 'lucide-react';
import StatusPill from './StatusPill';

export default function StudentCard({ student, onClick, onIntervene, index = 0 }) {
  const currentRisk = student.currentRisk || {};
  const riskLevel = currentRisk.level || 'Low';
  const riskScore = currentRisk.score;

  // Initials for avatar
  const initials = student.name
    ? student.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'ST';

  // Attendance and GPA calculation
  const attVal = student.latestAttendanceRate !== undefined
    ? Number(student.latestAttendanceRate).toFixed(1)
    : student.attendance !== undefined ? Number(student.attendance).toFixed(1) : '85.0';

  const gpaVal = student.latestGpa !== undefined
    ? Number(student.latestGpa).toFixed(2)
    : student.gpa !== undefined ? Number(student.gpa).toFixed(2) : '7.50';

  const lmsHours = student.latestLmsHours !== undefined
    ? Number(student.latestLmsHours).toFixed(1)
    : '4.5';

  const topFactor = currentRisk.topFactors && currentRisk.topFactors.length > 0
    ? currentRisk.topFactors[0]
    : null;

  return (
    <div
      className="rm-student-card rm-stagger-item"
      style={{ '--stagger-index': index }}
      onClick={() => onClick && onClick(student)}
    >
      {/* Card Header: Avatar + Name + Floating Risk Pill */}
      <div className="rm-student-card-header">
        <div className="rm-student-avatar-wrap">
          <div className="rm-student-avatar">
            {initials}
          </div>
          <div>
            <h3 className="rm-student-name" title={student.name}>{student.name}</h3>
            <p className="rm-student-roll">{student.rollNo || 'STU-2024'}</p>
          </div>
        </div>

        <div className="rm-student-pill-wrap">
          <StatusPill
            status={riskLevel}
            score={riskScore}
            size="sm"
          />
        </div>
      </div>

      {/* Program & Department Tag */}
      <div className="rm-student-meta">
        <span className="rm-student-dept">
          {student.department || 'Computer Science'}
        </span>
        <span className="rm-meta-dot">•</span>
        <span className="rm-student-sem">
          Year {student.year || 2} (Sem {student.semester || 4})
        </span>
      </div>

      {/* Metrics Row (RentMate-style clean micro-stat boxes) */}
      <div className="rm-student-stats-grid">
        <div className="rm-mini-stat">
          <span className="rm-mini-label">Attendance</span>
          <span className={`rm-mini-value ${Number(attVal) < 75 ? 'rm-text-danger' : Number(attVal) < 80 ? 'rm-text-warning' : 'rm-text-success'}`}>
            {attVal}%
          </span>
        </div>
        <div className="rm-mini-stat">
          <span className="rm-mini-label">GPA</span>
          <span className={`rm-mini-value ${Number(gpaVal) < 6.0 ? 'rm-text-danger' : 'rm-text-ink'}`}>
            {gpaVal}
          </span>
        </div>
        <div className="rm-mini-stat">
          <span className="rm-mini-label">LMS Study</span>
          <span className="rm-mini-value rm-text-ink">
            {lmsHours}h/wk
          </span>
        </div>
      </div>

      {/* Primary Risk Driver / Alert Note */}
      {riskLevel !== 'Low' && topFactor ? (
        <div className="rm-factor-alert">
          <AlertTriangle size={13} className="shrink-0 text-amber-600" />
          <span className="rm-factor-text">
            <strong>Key Driver:</strong> {topFactor.explanation || topFactor.label || topFactor.feature}
          </span>
        </div>
      ) : (
        <div className="rm-factor-alert rm-factor-good">
          <CheckCircle size={13} className="shrink-0 text-teal-600" />
          <span className="rm-factor-text">Academic milestones on schedule</span>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="rm-student-card-footer">
        <button
          type="button"
          className="rm-btn-secondary rm-btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onIntervene) onIntervene(student);
          }}
        >
          Intervene
        </button>

        <button
          type="button"
          className="rm-btn-primary rm-btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick(student);
          }}
        >
          <span>View Profile</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

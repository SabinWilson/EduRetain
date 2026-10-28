import React, { useState } from 'react';
import { X, HeartHandshake, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import api from '../services/api';

export default function InterventionModal({ student, onClose, onSuccess }) {
  const [type, setType] = useState('Attendance Counselling Meeting');
  const [targetRiskFactor, setTargetRiskFactor] = useState(
    student?.currentRisk?.topFactors?.[0]?.feature || 'avg_attendance'
  );
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('In Progress');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!student) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.post('/interventions', {
        studentId: student._id || student.id,
        type,
        targetRiskFactor,
        description,
        status,
        outcomeNotes,
        preInterventionScore: student?.currentRisk?.score || 0.5,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record intervention');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rm-modal-backdrop" onClick={onClose}>
      <div className="rm-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="rm-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="rm-modal-icon-wrap">
              <HeartHandshake size={20} color="var(--color-primary)" />
            </div>
            <div>
              <h3 className="rm-modal-title">Log Student Intervention</h3>
              <p className="rm-modal-subtitle">
                Targeted support for <strong>{student.name}</strong> ({student.rollNo})
              </p>
            </div>
          </div>
          <button type="button" className="rm-icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="rm-modal-body">
          {error && (
            <div className="rm-alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="rm-form-group">
            <label className="rm-label">Intervention Strategy</label>
            <select
              className="rm-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="Attendance Counselling Meeting">Attendance Counselling Meeting</option>
              <option value="Peer Tutoring / Remedial Classes">Peer Tutoring / Remedial Classes</option>
              <option value="Academic Recovery Plan">Academic Recovery Plan</option>
              <option value="Financial Aid / Scholarship Support">Financial Aid / Scholarship Support</option>
              <option value="Mental Health & Wellbeing Referral">Mental Health & Wellbeing Referral</option>
              <option value="Mentor-Parent Consultation">Mentor-Parent Consultation</option>
            </select>
          </div>

          <div className="rm-form-group">
            <label className="rm-label">Target Risk Factor</label>
            <select
              className="rm-select"
              value={targetRiskFactor}
              onChange={(e) => setTargetRiskFactor(e.target.value)}
            >
              <option value="avg_attendance">Low / Declining Attendance</option>
              <option value="avg_gpa">Low Cumulative GPA</option>
              <option value="backlog_count">Active Backlogs / Failed Courses</option>
              <option value="assignment_miss_rate">Unsubmitted Assignments</option>
              <option value="lms_time_spent">Low LMS Platform Engagement</option>
              <option value="overall_risk">General Holistic At-Risk Support</option>
            </select>
          </div>

          <div className="rm-form-group">
            <label className="rm-label">Initial Action Notes / Contract Terms</label>
            <textarea
              className="rm-textarea"
              rows={3}
              placeholder="Detail specific remedial goals, weekly meeting schedule, or tutoring commitments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="rm-row2">
            <div className="rm-form-group">
              <label className="rm-label">Initial Status</label>
              <select
                className="rm-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending Student Response</option>
                <option value="Completed">Completed / Resolved</option>
              </select>
            </div>

            <div className="rm-form-group">
              <label className="rm-label">Follow-up Outcome (Optional)</label>
              <input
                type="text"
                className="rm-input"
                placeholder="e.g. Student agreed to 85% attendance goal"
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="rm-modal-footer">
            <button
              type="button"
              className="rm-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rm-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Recording Intervention...' : 'Save Intervention'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

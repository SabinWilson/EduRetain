import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import RiskBadge from '../components/RiskBadge';
import DisclaimerBanner from '../components/DisclaimerBanner';
import {
  ArrowLeft,
  Calendar,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  TrendingDown,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  Check,
  X,
  History,
  FileText,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const StudentDetailPage = () => {
  const { id } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  // Intervention modal / log form
  const [showLogModal, setShowLogModal] = useState(false);
  const [intType, setIntType] = useState('Attendance Counselling Meeting');
  const [intDesc, setIntDesc] = useState('');
  const [intStatus, setIntStatus] = useState('Planned');
  const [intNotes, setIntNotes] = useState('');
  const [submittingInt, setSubmittingInt] = useState(false);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const [profRes, recRes] = await Promise.all([
        api.get(`/students/${id}/profile`),
        api.get(`/interventions/recommend/${id}`),
      ]);

      if (profRes.data.success) {
        setProfileData(profRes.data.data);
      }
      if (recRes.data.success) {
        setRecommendations(recRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching student detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [id]);

  const handleRecomputeRisk = async () => {
    try {
      setRecomputing(true);
      await api.post('/risk/recompute', { studentId: id });
      await fetchStudentData();
    } catch (err) {
      console.error('Recomputation failed:', err);
    } finally {
      setRecomputing(false);
    }
  };

  const handleAcceptRecommendation = async (rec) => {
    try {
      await api.post('/interventions/accept-recommendation', {
        studentId: id,
        type: rec.type,
        description: rec.description,
        targetRiskFactor: rec.targetRiskFactor,
      });
      // Refresh
      fetchStudentData();
    } catch (err) {
      alert('Failed to accept recommendation: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDismissRecommendation = (rec) => {
    setRecommendations((prev) => prev.filter((r) => r.type !== rec.type));
  };

  const handleCreateIntervention = async (e) => {
    e.preventDefault();
    try {
      setSubmittingInt(true);
      await api.post('/interventions', {
        studentId: id,
        type: intType,
        description: intDesc,
        status: intStatus,
        outcomeNotes: intNotes,
      });
      setShowLogModal(false);
      setIntDesc('');
      setIntNotes('');
      fetchStudentData();
    } catch (err) {
      alert('Failed to log intervention: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingInt(false);
    }
  };

  const handleUpdateInterventionStatus = async (intId, newStatus) => {
    try {
      await api.patch(`/interventions/${intId}`, {
        status: newStatus,
        outcomeNotes: newStatus === 'Completed' ? 'Intervention successfully executed.' : undefined,
      });
      fetchStudentData();
    } catch (err) {
      alert('Status update failed');
    }
  };

  if (loading || !profileData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading comprehensive student dossier...</p>
        </div>
      </div>
    );
  }

  const { student, summary, attendance, grades, lms, latestRisk, riskHistory, interventions, alerts } =
    profileData;

  // Chart datasets
  const attendanceChartData = attendance.map((a) => ({
    label: `${a.subject.slice(0, 10)}.. (${a.month})`,
    percentage: a.percentage,
    subject: a.subject,
  }));

  const gradesChartData = grades.map((g) => ({
    subject: g.subject.length > 15 ? `${g.subject.slice(0, 15)}...` : g.subject,
    gpa: g.gpa,
    examMarks: g.examMarks,
    backlog: g.backlog,
  }));

  const lmsChartData = lms.map((l) => ({
    week: `Wk ${l.week}`,
    logins: l.logins,
    hours: Math.round((l.timeSpentMinutes / 60) * 10) / 10,
    missed: l.assignmentsMissed,
  }));

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Link and Recompute Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Risk Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecomputeRisk}
            disabled={recomputing}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors disabled:opacity-50"
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin text-sky-600' : ''}`} />
            <span>{recomputing ? 'Re-scoring...' : 'Re-score with ML'}</span>
          </button>

          <button
            onClick={() => setShowLogModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Intervention</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {/* Student Profile Card Header */}
      <div className="glass-card rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-md shrink-0">
              {student.user?.name ? student.user.name.charAt(0) : 'S'}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">{student.user?.name}</h1>
                <RiskBadge level={student.currentRiskLevel} score={student.currentRiskScore} size="lg" />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-700">{student.rollNo}</span>
                <span>•</span>
                <span>{student.department}</span>
                <span>•</span>
                <span>{student.program} Year {student.year} (Semester {student.semester})</span>
                <span>•</span>
                <span>Mentor: <strong>{student.mentor?.name || 'Unassigned'}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Header Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Attendance</span>
              <p className={`text-base font-bold ${summary.avgAttendance < 75 ? 'text-rose-600' : 'text-slate-900'}`}>
                {summary.avgAttendance !== null ? `${summary.avgAttendance}%` : 'N/A'}
              </p>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Avg GPA</span>
              <p className={`text-base font-bold ${summary.avgGpa < 6.0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {summary.avgGpa !== null ? summary.avgGpa : 'N/A'}
              </p>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Backlogs</span>
              <p className={`text-base font-bold ${summary.backlogs > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {summary.backlogs}
              </p>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">LMS Study</span>
              <p className="text-base font-bold text-slate-900">{summary.totalLmsHours} hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* SHAP Explainability & Risk Drivers Panel */}
      <div className="glass-card rounded-2xl p-6 shadow-xs border-l-4 border-l-sky-500">
        <div className="flex items-center gap-2.5 mb-3">
          <BrainCircuit className="w-5 h-5 text-sky-600" />
          <h2 className="text-base font-bold text-slate-900">
            AI Model Explainability: Top Contributing Risk Factors (SHAP)
          </h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Shapley Additive exPlanations (SHAP) mathematically unpack the black box of the machine learning model, quantifying precisely why this student received a {student.currentRiskLevel} risk score.
        </p>

        {latestRisk?.topFactors && latestRisk.topFactors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {latestRisk.topFactors.map((factor, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  factor.is_risk_driver
                    ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                    : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {factor.is_risk_driver ? (
                      <TrendingUp className="w-4 h-4 text-rose-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="text-xs font-bold">{factor.label || factor.feature}</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      factor.is_risk_driver ? 'bg-rose-200/80 text-rose-800' : 'bg-emerald-200/80 text-emerald-800'
                    }`}
                  >
                    SHAP: {factor.shap_value > 0 ? `+${factor.shap_value}` : factor.shap_value}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed opacity-90">
                  {factor.explanation}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No detailed SHAP factors computed yet.</p>
        )}
      </div>

      {/* System Recommended Interventions (Accept / Dismiss) */}
      <div className="glass-card rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Targeted Interventions Recommended by EduRetain
              </h2>
              <p className="text-xs text-slate-400">
                Derived directly from primary SHAP attrition factors
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
            {recommendations.length} Pending Actions
          </span>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
            All system recommendations have been scheduled or completed. No pending automated proposals.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{rec.type}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                      Priority: {rec.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">{rec.description}</p>
                  <p className="text-[11px] text-amber-700 italic">Rationale: {rec.rationales}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleAcceptRecommendation(rec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept & Schedule</span>
                  </button>
                  <button
                    onClick={() => handleDismissRecommendation(rec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Trends Row: Attendance, Grades, LMS Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="glass-card rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Attendance Records
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">75% Threshold</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceChartData} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} angle={-25} textAnchor="end" />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Attendance']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="percentage" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grades Performance */}
        <div className="glass-card rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Grade Distribution (GPA)
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">10-Point Scale</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradesChartData} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="subject" stroke="#94a3b8" fontSize={9} angle={-25} textAnchor="end" />
                <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => [`${val}/10`, 'Subject GPA']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="gpa" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LMS Digital Engagement */}
        <div className="glass-card rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              LMS Weekly Study Hours
            </h3>
            <span className="text-[10px] font-semibold text-slate-400">Recent Weeks</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lmsChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip
                  formatter={(val) => [`${val} hrs`, 'Active LMS Time']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Intervention Log & History with Impact Delta */}
      <div className="glass-card rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Intervention Log & Retention Efficacy</h3>
            <p className="text-xs text-slate-400">
              Track planned faculty actions and post-intervention retention impact
            </p>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Action</span>
          </button>
        </div>

        {interventions.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No interventions logged for this student yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Intervention Type</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pre/Post Score Delta</th>
                  <th className="px-4 py-2.5">Notes</th>
                  <th className="px-4 py-2.5 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {interventions.map((intv) => (
                  <tr key={intv._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(intv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{intv.type}</div>
                      <div className="text-[11px] text-slate-500">{intv.description}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          intv.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : intv.status === 'In Progress'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {intv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {intv.scoreDelta !== null && intv.scoreDelta !== undefined ? (
                        <span className={intv.scoreDelta < 0 ? 'text-emerald-600 font-bold' : 'text-rose-600'}>
                          {intv.scoreDelta > 0 ? `+${(intv.scoreDelta * 100).toFixed(1)}%` : `${(intv.scoreDelta * 100).toFixed(1)}%`}
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ({Math.round(intv.preInterventionScore * 100)}% → {Math.round(intv.postInterventionScore * 100)}%)
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending Re-evaluation</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 italic">
                      {intv.outcomeNotes || 'No notes added'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {intv.status !== 'Completed' && (
                        <div className="flex items-center justify-end gap-1.5">
                          {intv.status === 'Planned' && (
                            <button
                              onClick={() => handleUpdateInterventionStatus(intv._id, 'In Progress')}
                              className="px-2 py-1 rounded bg-sky-50 text-sky-700 hover:bg-sky-100 font-semibold text-[10px]"
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateInterventionStatus(intv._id, 'Completed')}
                            className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-[10px]"
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Logging New Intervention */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="glass-card bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Log Student Intervention</h3>
              <button
                onClick={() => setShowLogModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateIntervention} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intervention Strategy
                </label>
                <select
                  value={intType}
                  onChange={(e) => setIntType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="Attendance Counselling Meeting">Attendance Counselling Meeting</option>
                  <option value="Peer Tutoring / Remedial Classes">Peer Tutoring / Remedial Classes</option>
                  <option value="Mentor Check-in and Engagement Nudge">Mentor Check-in and Engagement Nudge</option>
                  <option value="Academic Recovery Plan">Academic Recovery Plan</option>
                  <option value="LMS Technical & Study Support">LMS Technical & Study Support</option>
                  <option value="General Academic Guidance">General Academic Guidance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Action Items
                </label>
                <textarea
                  required
                  rows={3}
                  value={intDesc}
                  onChange={(e) => setIntDesc(e.target.value)}
                  placeholder="Outline agreed targets, meeting schedules, or remedial clinic assignments..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={intStatus}
                    onChange={(e) => setIntStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="Planned">Planned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Outcome Notes</label>
                  <input
                    type="text"
                    value={intNotes}
                    onChange={(e) => setIntNotes(e.target.value)}
                    placeholder="Initial remarks (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInt}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingInt ? 'Saving...' : 'Save Intervention'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetailPage;

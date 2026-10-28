import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import StudentCard from '../components/StudentCard';
import StatusPill from '../components/StatusPill';
import InterventionModal from '../components/InterventionModal';
import {
  Users,
  AlertTriangle,
  HeartHandshake,
  CheckCircle,
  Search,
  LayoutGrid,
  List,
  RefreshCw,
  TrendingDown,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [sort, setSort] = useState('risk_desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [activeInterventionStudent, setActiveInterventionStudent] = useState(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [sumRes, stuRes] = await Promise.all([
        api.get('/risk/dashboard-summary').catch(() => ({ data: { success: false } })),
        api.get('/students?limit=250').catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (sumRes.data.success) {
        setSummaryData(sumRes.data);
      }
      if (stuRes.data.success) {
        setStudents(stuRes.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Filter & Sort Logic
  const filteredStudents = students
    .filter((s) => {
      const studentName = s.user?.name || s.name || '';
      const roll = s.rollNo || '';
      const matchSearch =
        search === '' ||
        studentName.toLowerCase().includes(search.toLowerCase()) ||
        roll.toLowerCase().includes(search.toLowerCase());

      const sRiskLevel = s.currentRisk?.level || s.currentRiskLevel || 'Low';
      const matchRisk = riskFilter === 'All' || sRiskLevel === riskFilter;
      const matchDept = deptFilter === 'All' || s.department === deptFilter;

      return matchSearch && matchRisk && matchDept;
    })
    .sort((a, b) => {
      const riskA = a.currentRisk?.score ?? a.currentRiskScore ?? 0;
      const riskB = b.currentRisk?.score ?? b.currentRiskScore ?? 0;
      const attA = a.latestAttendanceRate ?? 80;
      const attB = b.latestAttendanceRate ?? 80;
      const gpaA = a.latestGpa ?? 7;
      const gpaB = b.latestGpa ?? 7;
      const nameA = a.user?.name || a.name || '';
      const nameB = b.user?.name || b.name || '';

      if (sort === 'risk_desc') return riskB - riskA;
      if (sort === 'risk_asc') return riskA - riskB;
      if (sort === 'att_asc') return attA - attB;
      if (sort === 'gpa_asc') return gpaA - gpaB;
      if (sort === 'name_asc') return nameA.localeCompare(nameB);
      return 0;
    });

  const totalStudents = summaryData?.totalStudents || students.length || 0;
  const highRiskCount = summaryData?.riskDistribution?.find(r => r._id === 'High')?.count || students.filter(s => (s.currentRisk?.level || s.currentRiskLevel) === 'High').length;
  const mediumRiskCount = summaryData?.riskDistribution?.find(r => r._id === 'Medium')?.count || students.filter(s => (s.currentRisk?.level || s.currentRiskLevel) === 'Medium').length;
  const activeInterventions = summaryData?.interventionMetrics?.inProgressCount || 12;

  // Departments list for filter
  const departments = ['All', 'Computer Science', 'Information Technology', 'Electronics & Communication', 'Mechanical Engineering', 'Data Science'];

  return (
    <div>
      {/* Page Header */}
      <div className="rm-page-header">
        <div>
          <h1 className="rm-page-title">
            <span>Student Retention Dashboard</span>
          </h1>
          <p className="rm-page-subtitle">
            Early dropout prediction, AI risk attributions, and proactive student intervention management
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="rm-btn-secondary rm-btn-sm"
            onClick={fetchDashboard}
            title="Refresh student risk signals"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* RentMate Style Stat Row */}
      <div className="rm-stat-row">
        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Students Monitored</div>
            <div className="rm-stat-val">{totalStudents}</div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Users size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">High Risk Flagged</div>
            <div className="rm-stat-val" style={{ color: 'var(--color-red)' }}>{highRiskCount}</div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Moderate Attention</div>
            <div className="rm-stat-val" style={{ color: 'var(--color-amber)' }}>{mediumRiskCount}</div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="rm-stat-card">
          <div>
            <div className="rm-stat-lbl">Active Interventions</div>
            <div className="rm-stat-val" style={{ color: 'var(--color-primary)' }}>{activeInterventions}</div>
          </div>
          <div className="rm-stat-icon-wrap" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <HeartHandshake size={22} />
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar (Adapted from RentMate BrowseView controls) */}
      <div className="rm-controls-row">
        {/* Risk Filter Chips */}
        <div className="rm-filters">
          {['All', 'High', 'Medium', 'Low'].map((rf) => (
            <button
              type="button"
              key={rf}
              className={`rm-chip ${riskFilter === rf ? 'active' : ''}`}
              onClick={() => setRiskFilter(rf)}
            >
              {rf === 'All' ? 'All Risk Levels' : `${rf} Risk`}
            </button>
          ))}
        </div>

        {/* Right Search, Dept & Sort Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="rm-search-box">
            <Search size={15} color="var(--color-text-muted)" />
            <input
              placeholder="Search by name or roll number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="rm-sort-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>
            ))}
          </select>

          <select
            className="rm-sort-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="risk_desc">Risk: Highest First</option>
            <option value="risk_asc">Risk: Lowest First</option>
            <option value="att_asc">Attendance: Lowest First</option>
            <option value="gpa_asc">GPA: Lowest First</option>
            <option value="name_asc">Name: A to Z</option>
          </select>

          {/* View Mode Toggle: Grid vs Table */}
          <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '7px 10px',
                background: viewMode === 'grid' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: viewMode === 'grid' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '7px 10px',
                background: viewMode === 'table' ? 'var(--color-primary-light)' : 'var(--color-surface)',
                color: viewMode === 'table' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                border: 'none',
                borderLeft: '1px solid var(--color-border)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Card Grid or Data Table */}
      {loading ? (
        <div className="rm-grid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rm-student-card" style={{ height: 210, opacity: 0.6 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-border)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: '60%', height: 16, background: 'var(--color-border)', borderRadius: 4, marginBottom: 6 }} />
                  <div style={{ width: '40%', height: 12, background: 'var(--color-border)', borderRadius: 4 }} />
                </div>
              </div>
              <div style={{ width: '100%', height: 45, background: 'var(--color-surface-subtle)', borderRadius: 8, marginBottom: 14 }} />
              <div style={{ width: '100%', height: 32, background: 'var(--color-border)', borderRadius: 6, marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '48px 24px', textAlign: 'center' }}>
          <Users size={36} color="var(--color-text-muted)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>No Students Found</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>Try clearing your filters or changing search keywords.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Card-based listing grid */
        <div className="rm-grid">
          {filteredStudents.map((student, idx) => (
            <StudentCard
              key={student._id || student.id}
              student={{
                ...student,
                name: student.user?.name || student.name,
                currentRisk: student.currentRisk || {
                  level: student.currentRiskLevel || 'Low',
                  score: student.currentRiskScore || 0.2,
                  topFactors: student.currentRiskFactors || [],
                },
              }}
              index={idx}
              onClick={(s) => navigate(`/students/${s._id || s.id}`)}
              onIntervene={(s) => setActiveInterventionStudent(s)}
            />
          ))}
        </div>
      ) : (
        /* RentMate Style Management Table */
        <div className="rm-table-wrap">
          <table className="rm-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Department</th>
                <th>Year & Sem</th>
                <th>Risk Status</th>
                <th>Attendance</th>
                <th>GPA</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s) => {
                const sName = s.user?.name || s.name;
                const rLevel = s.currentRisk?.level || s.currentRiskLevel || 'Low';
                const rScore = s.currentRisk?.score ?? s.currentRiskScore;
                const att = s.latestAttendanceRate !== undefined ? Number(s.latestAttendanceRate).toFixed(1) : '85.0';
                const gpa = s.latestGpa !== undefined ? Number(s.latestGpa).toFixed(2) : '7.50';

                return (
                  <tr key={s._id || s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 12,
                        }}>
                          {sName ? sName[0].toUpperCase() : 'S'}
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{sName}</span>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.rollNo}</td>
                    <td>{s.department}</td>
                    <td>Year {s.year} (Sem {s.semester})</td>
                    <td>
                      <StatusPill status={rLevel} score={rScore} size="sm" />
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: Number(att) < 75 ? 'var(--color-red)' : 'inherit' }}>
                        {att}%
                      </span>
                    </td>
                    <td>{gpa}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 8 }}>
                        <button
                          type="button"
                          className="rm-btn-secondary rm-btn-sm"
                          onClick={() => setActiveInterventionStudent(s)}
                        >
                          Intervene
                        </button>
                        <button
                          type="button"
                          className="rm-btn-primary rm-btn-sm"
                          onClick={() => navigate(`/students/${s._id || s.id}`)}
                        >
                          <span>Profile</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Intervention Modal */}
      {activeInterventionStudent && (
        <InterventionModal
          student={activeInterventionStudent}
          onClose={() => setActiveInterventionStudent(null)}
          onSuccess={() => {
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import StatusPill from '../components/StatusPill';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react';


export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('mentor');
  const [newDept, setNewDept] = useState('Computer Science');
  const [creating, setCreating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users?limit=150');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (userId) => {
    try {
      const res = await api.patch(`/admin/users/${userId}/toggle-status`);
      if (res.data.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === userId ? { ...u, isActive: res.data.data.isActive } : u))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    }
  };


  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const res = await api.post('/admin/users', {
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        department: newDept,
      });

      if (res.data.success) {
        setShowCreateModal(false);
        setNewName('');
        setNewEmail('');
        fetchUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const pendingMentorsCount = users.filter((u) => u.role === 'mentor' && !u.isActive).length;

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      search === '' ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      roleFilter === 'All'
        ? true
        : roleFilter === 'pending'
        ? u.role === 'mentor' && !u.isActive
        : u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      {/* Page Header */}
      <div className="rm-page-header">
        <div>
          <h1 className="rm-page-title">
            <Users size={24} color="var(--color-primary)" />
            <span>User Account Management</span>
          </h1>
          <p className="rm-page-subtitle">
            Manage institutional access for administrators, faculty mentors, and enrolled students
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="rm-btn-primary"
        >
          <UserPlus size={15} />
          <span>New User Account</span>
        </button>
      </div>

      {/* Controls & Search Filter Bar (RentMate Style) */}
      <div className="rm-controls-row">
        <div className="rm-filters">
          {[
            { id: 'All', label: 'All Roles' },
            { id: 'pending', label: 'Pending Approvals', badge: pendingMentorsCount },
            { id: 'admin', label: 'Admins' },
            { id: 'mentor', label: 'Mentors' },
            { id: 'student', label: 'Students' },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              className={`rm-chip ${roleFilter === item.id ? 'active' : ''}`}
              onClick={() => setRoleFilter(item.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  style={{
                    background: roleFilter === item.id ? 'var(--color-primary)' : 'var(--color-amber)',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 9999,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>


        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="rm-search-box">
            <Search size={15} color="var(--color-text-muted)" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user name or email..."
            />
          </div>

          <span style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
            {filteredUsers.length} accounts
          </span>
        </div>
      </div>

      {/* RentMate Style Management Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <RefreshCw size={24} className="animate-spin text-teal-600" style={{ margin: '0 auto 8px' }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading accounts...</p>
        </div>
      ) : (
        <div className="rm-table-wrap">
          <table className="rm-table">
            <thead>
              <tr>
                <th>User Account</th>
                <th>Role</th>
                <th>Department</th>
                <th>Access Status</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {u.name ? u.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{u.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <StatusPill
                      status={
                        u.role === 'admin'
                          ? 'Active'
                          : u.role === 'mentor'
                          ? u.isActive
                            ? 'Approved'
                            : 'Pending'
                          : 'Approved'
                      }
                      label={
                        u.role === 'admin'
                          ? 'Administrator'
                          : u.role === 'mentor'
                          ? u.isActive
                            ? 'Faculty Mentor'
                            : 'Mentor (Pending)'
                          : 'Student'
                      }
                      size="sm"
                    />
                  </td>

                  <td style={{ color: 'var(--color-text-secondary)' }}>{u.department}</td>

                  <td>
                    {u.role === 'mentor' && !u.isActive ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 600,
                          color: 'var(--color-amber-dark)',
                          background: 'var(--color-amber-light)',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid rgba(217, 119, 6, 0.3)',
                        }}
                      >
                        <Clock size={12} color="var(--color-amber-dark)" />
                        <span>Pending Approval</span>
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 600,
                          color: u.isActive ? 'var(--color-teal)' : 'var(--color-text-muted)',
                        }}
                      >
                        {u.isActive ? (
                          <>
                            <CheckCircle size={14} color="var(--color-teal)" />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={14} color="var(--color-red)" />
                            <span style={{ textDecoration: 'line-through' }}>Deactivated</span>
                          </>
                        )}
                      </span>
                    )}
                  </td>

                  <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {u.role === 'mentor' && !u.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u._id)}
                        className="rm-btn-primary rm-btn-sm"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        Approve Mentor
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u._id)}
                        className={u.isActive ? 'rm-btn-secondary rm-btn-sm' : 'rm-btn-primary rm-btn-sm'}
                        style={u.isActive ? { borderColor: 'var(--color-red)', color: 'var(--color-red)' } : {}}
                      >
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal (RentMate Style) */}
      {showCreateModal && (
        <div className="rm-modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="rm-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rm-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="rm-modal-icon-wrap">
                  <UserPlus size={18} color="var(--color-primary)" />
                </div>
                <div>
                  <h3 className="rm-modal-title">Create Institutional Account</h3>
                  <p className="rm-modal-subtitle">Provision login credentials for faculty or staff</p>
                </div>
              </div>
              <button
                type="button"
                className="rm-icon-btn"
                onClick={() => setShowCreateModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="rm-modal-body">
              <div className="rm-form-group">
                <label className="rm-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Dr. Jane Goodall"
                  className="rm-input"
                />
              </div>

              <div className="rm-form-group">
                <label className="rm-label">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. faculty@institution.edu"
                  className="rm-input"
                />
              </div>


              <div className="rm-row2">
                <div className="rm-form-group">
                  <label className="rm-label">Account Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="rm-select"
                  >
                    <option value="mentor">Faculty Mentor</option>
                    <option value="admin">Administrator</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="rm-form-group">
                  <label className="rm-label">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="rm-select"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics & Communication">Electronics & Communication</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                    <option value="Data Science">Data Science</option>
                    <option value="Academic Administration">Academic Administration</option>
                  </select>
                </div>
              </div>

              <div className="rm-form-group">
                <label className="rm-label">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rm-input"
                />
              </div>

              <div className="rm-modal-footer" style={{ margin: '20px -24px -24px' }}>
                <button
                  type="button"
                  className="rm-btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rm-btn-primary"
                >
                  {creating ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

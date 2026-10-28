import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketAlerts } from '../context/SocketContext';
import {
  GraduationCap,
  Bell,
  LogOut,
  ShieldCheck,
  UserCheck,
  BookOpen,
  LayoutDashboard,
  AlertTriangle,
  HeartHandshake,
  Users,
  Activity,
  FileSpreadsheet,
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocketAlerts();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const role = user.role || 'student';
  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'mentor'
      ? 'Faculty Mentor'
      : 'Student';

  const RoleIcon =
    role === 'admin'
      ? ShieldCheck
      : role === 'mentor'
      ? UserCheck
      : BookOpen;

  const isCurrent = (path) => location.pathname === path;

  return (
    <header className="rm-header">
      <div className="rm-header-row">
        {/* Left: Brand with Emblem & Tag */}
        <Link to="/" className="rm-brand" title="EduRetain Retention Portal">
          <div className="rm-brand-emblem">
            <GraduationCap size={18} color="#FFFFFF" />
          </div>
          <span>EduRetain</span>
          <span className="rm-brand-tag">AI RETENTION</span>
        </Link>

        {/* Center: Contextual Role-Based Horizontal Navigation Links */}
        <nav className="rm-nav-center">
          {(role === 'mentor' || role === 'admin') && (
            <>
              <Link
                to="/dashboard"
                className={`rm-nav-link ${isCurrent('/dashboard') ? 'active' : ''}`}
              >
                <LayoutDashboard size={15} />
                <span>{role === 'mentor' ? 'My Students' : 'Dashboard'}</span>
              </Link>

              <Link
                to="/alerts"
                className={`rm-nav-link ${isCurrent('/alerts') ? 'active' : ''}`}
              >
                <AlertTriangle size={15} />
                <span>Early Alerts</span>
                {unreadCount > 0 && (
                  <span className="rm-link-badge">{unreadCount}</span>
                )}
              </Link>

              <Link
                to="/interventions"
                className={`rm-nav-link ${isCurrent('/interventions') ? 'active' : ''}`}
              >
                <HeartHandshake size={15} />
                <span>Interventions</span>
              </Link>
            </>
          )}

          {role === 'admin' && (
            <>
              <Link
                to="/admin/users"
                className={`rm-nav-link ${isCurrent('/admin/users') ? 'active' : ''}`}
              >
                <Users size={15} />
                <span>Users</span>
              </Link>

              <Link
                to="/admin/metrics"
                className={`rm-nav-link ${isCurrent('/admin/metrics') ? 'active' : ''}`}
              >
                <Activity size={15} />
                <span>Model & Metrics</span>
              </Link>

              <Link
                to="/admin/import"
                className={`rm-nav-link ${isCurrent('/admin/import') ? 'active' : ''}`}
              >
                <FileSpreadsheet size={15} />
                <span>CSV Import</span>
              </Link>
            </>
          )}

          {role === 'student' && (
            <Link
              to="/portal"
              className={`rm-nav-link ${isCurrent('/portal') ? 'active' : ''}`}
            >
              <BookOpen size={15} />
              <span>My Academic Hub</span>
            </Link>
          )}
        </nav>

        {/* Right: User Status Chip & Utility Cluster */}
        <div className="rm-nav-icons">
          {/* Live Alerts Bell for Mentors and Admins */}
          {(role === 'mentor' || role === 'admin') && (
            <button
              type="button"
              className="rm-notif-btn"
              onClick={() => navigate('/alerts')}
              title="Retention Alerts"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="rm-notif-badge">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {/* User Status Chip */}
          <div className="rm-userchip">
            <span className="rm-role-badge">
              <RoleIcon size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 4 }} />
              {roleLabel}
            </span>
            <span className="rm-user-name" title={user.name}>{user.name}</span>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            className="rm-icon-btn rm-logout-btn"
            onClick={handleLogout}
            title="Sign out of EduRetain"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

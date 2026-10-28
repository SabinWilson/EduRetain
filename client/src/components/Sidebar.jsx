import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocketAlerts } from '../context/SocketContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  Bell,
  HeartHandshake,
  UploadCloud,
  Cpu,
  UserCheck,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

const Sidebar = ({ isOpen, closeSidebar }) => {
  const { user } = useAuth();
  const { unreadCount } = useSocketAlerts();
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState('');

  if (!user) return null;

  const handleGlobalRecompute = async () => {
    try {
      setRecomputing(true);
      setRecomputeMsg('Recomputing...');
      const res = await api.post('/risk/recompute', {});
      if (res.data.success) {
        setRecomputeMsg(`Done! (${res.data.recomputedCount})`);
        setTimeout(() => {
          setRecomputeMsg('');
          window.location.reload();
        }, 1200);
      }
    } catch (err) {
      setRecomputeMsg('Failed');
      setTimeout(() => setRecomputeMsg(''), 2000);
    } finally {
      setRecomputing(false);
    }
  };

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
      isActive
        ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
    }`;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 md:top-15 z-40 h-[calc(100vh-60px)] w-64 bg-white/80 backdrop-blur-md border-r border-slate-200/80 p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Main Navigation */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Navigation
            </p>
            <nav className="space-y-1">
              {(user.role === 'mentor' || user.role === 'admin') && (
                <>
                  <NavLink to="/dashboard" onClick={closeSidebar} className={navClass}>
                    <LayoutDashboard className="w-4 h-4" />
                    <span>Risk Dashboard</span>
                  </NavLink>

                  <NavLink to="/alerts" onClick={closeSidebar} className={navClass}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4" />
                        <span>Early Alerts</span>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </NavLink>

                  <NavLink to="/interventions" onClick={closeSidebar} className={navClass}>
                    <HeartHandshake className="w-4 h-4" />
                    <span>Interventions</span>
                  </NavLink>
                </>
              )}

              {user.role === 'student' && (
                <NavLink to="/portal" onClick={closeSidebar} className={navClass}>
                  <BookOpen className="w-4 h-4" />
                  <span>My Academic Hub</span>
                </NavLink>
              )}
            </nav>
          </div>

          {/* Admin Management Navigation */}
          {user.role === 'admin' && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/import" onClick={closeSidebar} className={navClass}>
                  <UploadCloud className="w-4 h-4" />
                  <span>CSV Data Import</span>
                </NavLink>

                <NavLink to="/admin/users" onClick={closeSidebar} className={navClass}>
                  <Users className="w-4 h-4" />
                  <span>User Management</span>
                </NavLink>

                <NavLink to="/admin/metrics" onClick={closeSidebar} className={navClass}>
                  <Cpu className="w-4 h-4" />
                  <span>ML Model & Tuning</span>
                </NavLink>
              </nav>
            </div>
          )}
        </div>

        {/* Bottom Actions: Recompute Trigger */}
        {(user.role === 'mentor' || user.role === 'admin') && (
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={handleGlobalRecompute}
              disabled={recomputing}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
              title="Trigger instant batch re-scoring of students"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recomputing ? 'animate-spin text-sky-600' : ''}`} />
              <span>{recomputeMsg || 'Recompute Risk Scores'}</span>
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Nightly cron runs at 02:00 AM
            </p>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;

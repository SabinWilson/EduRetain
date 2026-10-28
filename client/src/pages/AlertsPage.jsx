import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocketAlerts } from '../context/SocketContext';
import DisclaimerBanner from '../components/DisclaimerBanner';
import {
  Bell,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';

const AlertsPage = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { decrementUnread, resetUnread } = useSocketAlerts();

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/alerts?unreadOnly=${unreadOnly}`);
      if (res.data.success) {
        setAlerts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [unreadOnly]);

  const handleMarkAsRead = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);
      setAlerts((prev) =>
        prev.map((a) => (a._id === alertId ? { ...a, isRead: true, readAt: new Date() } : a))
      );
      decrementUnread(1);
    } catch (err) {
      console.error('Failed to mark alert as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/alerts/read-all');
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true, readAt: new Date() })));
      resetUnread();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Early Retention Alerts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time triggers generated when students escalate into high dropout risk or exhibit critical deficits
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              unreadOnly
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{unreadOnly ? 'Showing Unread Only' : 'Show All'}</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      <DisclaimerBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-sky-600 animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Alerts Recorded</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {unreadOnly
              ? 'You have caught up with all early warnings! Toggle filter to view past resolved alerts.'
              : 'The system has not detected critical risk score spikes.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className={`glass-card rounded-xl p-4 sm:p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 ${
                !alert.isRead ? 'border-l-rose-500 bg-rose-50/20' : 'border-l-slate-300'
              }`}
            >
              <div className="flex items-start gap-3.5 max-w-3xl">
                <div
                  className={`p-2.5 rounded-xl shrink-0 ${
                    alert.level === 'High'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {alert.level === 'High' ? (
                    <ShieldAlert className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {alert.student?.user?.name || 'Student Alert'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                      {alert.student?.rollNo}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        alert.level === 'High'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {alert.level} Risk
                    </span>
                    {!alert.isRead && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    )}
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">{alert.message}</p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(alert.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {!alert.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(alert._id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                  >
                    Mark Read
                  </button>
                )}

                {alert.student?._id && (
                  <Link
                    to={`/students/${alert.student._id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <span>Inspect Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;

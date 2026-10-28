import React from 'react';
import { useSocketAlerts } from '../context/SocketContext';
import { AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Toast = () => {
  const { latestAlert, clearLatestAlert } = useSocketAlerts();
  const navigate = useNavigate();

  if (!latestAlert) return null;

  return (
    <div className="fixed top-16 right-5 z-50 max-w-sm w-full bg-white border border-rose-200 rounded-xl shadow-xl p-4 animate-bounce-short">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-rose-100 text-rose-600 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900">New High Risk Alert</h4>
          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{latestAlert.message}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => {
                clearLatestAlert();
                navigate('/alerts');
              }}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
            >
              View Alert
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={clearLatestAlert}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={clearLatestAlert}
          className="text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;

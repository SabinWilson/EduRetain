import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import DisclaimerBanner from '../components/DisclaimerBanner';
import {
  HeartHandshake,
  CheckCircle2,
  Clock,
  Filter,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const InterventionsPage = () => {
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchInterventions = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'All' ? '/interventions' : `/interventions?status=${statusFilter}`;
      const res = await api.get(url);
      if (res.data.success) {
        setInterventions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching interventions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [statusFilter]);

  const handleUpdateStatus = async (intId, newStatus) => {
    try {
      await api.patch(`/interventions/${intId}`, { status: newStatus });
      fetchInterventions();
    } catch (err) {
      alert('Status update failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Retention Interventions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Faculty advisory meetings, remedial clinics, and academic recovery plans tracked for retention efficacy
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <DisclaimerBanner />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 text-sky-600 animate-spin" />
        </div>
      ) : interventions.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Interventions Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Log interventions from the Student Detail page or accept system-recommended actions.
          </p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-4 py-3">Intervention Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Retention Impact (Score Δ)</th>
                  <th className="px-4 py-3">Date Logged</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {interventions.map((intv) => (
                  <tr key={intv._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">
                        {intv.student?.user?.name || 'Student'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {intv.student?.rollNo}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{intv.type}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">
                        {intv.description}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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

                    <td className="px-4 py-3 text-slate-500">
                      {intv.recommendedBySystem ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                          AI Recommended
                        </span>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                          Faculty Manual
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono">
                      {intv.scoreDelta !== null && intv.scoreDelta !== undefined ? (
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            intv.scoreDelta < 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {intv.scoreDelta < 0 ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : (
                            <TrendingUp className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {intv.scoreDelta > 0
                              ? `+${(intv.scoreDelta * 100).toFixed(1)}%`
                              : `${(intv.scoreDelta * 100).toFixed(1)}%`}
                          </span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Evaluating</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      {new Date(intv.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {intv.status === 'Planned' && (
                          <button
                            onClick={() => handleUpdateStatus(intv._id, 'In Progress')}
                            className="px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold text-[10px]"
                          >
                            Start
                          </button>
                        )}
                        {intv.status !== 'Completed' && (
                          <button
                            onClick={() => handleUpdateStatus(intv._id, 'Completed')}
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-[10px]"
                          >
                            Complete
                          </button>
                        )}
                        {intv.student?._id && (
                          <Link
                            to={`/students/${intv.student._id}`}
                            className="p-1 text-slate-400 hover:text-sky-600"
                            title="View student profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterventionsPage;

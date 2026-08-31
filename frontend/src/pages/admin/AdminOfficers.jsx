import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminOfficers } from '../../services/api';
import {
  Users, Loader2, AlertCircle, RefreshCw, ArrowRight,
  ShieldCheck, XCircle, Clock, ChevronRight,
} from 'lucide-react';

export default function AdminOfficers() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminOfficers()
      .then((d) => setOfficers(d.officers || []))
      .catch(() => setError('Unable to load officer data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <Users size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Officers</h1>
            <p className="text-slate-500 text-sm mt-0.5">Per-officer compliance analytics</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={load} className="text-sm text-red-600 hover:underline font-medium">Retry</button>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
      )}

      {!loading && !error && officers.length === 0 && (
        <div className="card p-16 text-center">
          <Users size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No officer accounts found.</p>
        </div>
      )}

      {!loading && officers.length > 0 && (
        <div className="card overflow-hidden animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Scans</th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1 justify-end"><ShieldCheck size={11} className="text-emerald-500" />Approved</span>
                  </th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1 justify-end"><XCircle size={11} className="text-rose-500" />Rejected</span>
                  </th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <span className="flex items-center gap-1 justify-end"><Clock size={11} className="text-amber-500" />Review</span>
                  </th>
                  <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Scan</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {officers.map((o) => {
                  const complianceRate = o.totalScans > 0
                    ? Math.round((o.approved / o.totalScans) * 100)
                    : 0;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                            {o.name?.[0]?.toUpperCase() ?? 'O'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{o.name}</p>
                            <p className="text-xs text-slate-400 truncate max-w-[180px]">{o.email || '—'}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="progress-bar-track" style={{ width: 60, height: 4 }}>
                                <div className="progress-bar-fill" style={{ width: `${complianceRate}%` }} />
                              </div>
                              <span className="text-xs text-slate-400">{complianceRate}%</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-bold text-slate-700">{o.totalScans}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-emerald-600">{o.approved}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-rose-600">{o.rejected}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-amber-600">{o.reviewRequired}</span>
                      </td>
                      <td className="px-4 py-4 text-right text-slate-400 text-xs">
                        {o.lastScan ? new Date(o.lastScan).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link to={`/admin/officers/${o.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
                          Details <ChevronRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

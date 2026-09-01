import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAdminOfficerById } from '../../services/api';
import {
  Users, Loader2, AlertCircle, RefreshCw, ArrowLeft,
  ShieldCheck, XCircle, Clock, Package, ExternalLink,
} from 'lucide-react';

const STATUS_BADGE = {
  APPROVED:        { label: 'Approved',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:        { label: 'Rejected',        cls: 'bg-rose-50 text-rose-700 border-rose-200'         },
  REVIEW_REQUIRED: { label: 'Review Required', cls: 'bg-amber-50 text-amber-700 border-amber-200'      },
  UNKNOWN:         { label: 'Unknown',         cls: 'bg-slate-50 text-slate-500 border-slate-200'      },
};

function StatusBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.UNKNOWN;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminOfficerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminOfficerById(id)
      .then(setData)
      .catch((err) => {
        const msg = err.response?.data?.error || 'Unable to load officer details.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Back nav */}
      <Link to="/admin/officers"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-6">
        <ArrowLeft size={15} />Back to Officers
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-6">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-red-600 hover:underline font-medium">
            <RefreshCw size={13} />Retry
          </button>
        </div>
      )}

      {data && (
        <div className="animate-fade-in space-y-6">
          {/* Officer Header */}
          <div className="card p-6 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700 shrink-0">
              {data.name?.[0]?.toUpperCase() ?? 'O'}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-800">{data.name}</h1>
              <p className="text-sm text-slate-500 mt-0.5">Legal Metrology Officer</p>
              <p className="text-sm text-slate-400 mt-1">{data.email || '—'}</p>
            </div>
            <button onClick={load} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
              <RefreshCw size={15} />Refresh
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 px-1">
            <Clock size={15} className="text-slate-400" />
            Last scan: {data.lastScan
              ? new Date(data.lastScan).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
              : 'No scans yet'}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Scans', value: data.totalScans,     icon: Package,     color: 'text-blue-600 bg-blue-50'   },
              { label: 'Approved',    value: data.approved,       icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-50'},
              { label: 'Rejected',    value: data.rejected,       icon: XCircle,     color: 'text-rose-600 bg-rose-50'   },
              { label: 'Review Req.', value: data.reviewRequired, icon: Clock,       color: 'text-amber-600 bg-amber-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="stat-card">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${color.split(' ')[1]}`}>
                    <Icon size={16} className={color.split(' ')[0]} />
                  </div>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
                <p className="text-3xl font-bold text-slate-800">{value ?? 0}</p>
              </div>
            ))}
          </div>

          {/* Scan History */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Recent Scan History</h2>
            </div>

            {!data.recentScans?.length ? (
              <div className="py-16 text-center">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No scans found for this officer.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Inspection ID</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentScans.map((scan) => (
                      <tr key={scan.inspection_id || scan.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3.5">
                          <p className="font-medium text-slate-800 truncate max-w-[200px]">{scan.product_name || '—'}</p>
                          <p className="text-xs text-slate-400">{scan.category || ''}</p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-xs text-slate-500">{scan.inspection_id || scan.id}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {scan.created_at ? new Date(scan.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge status={scan.complianceStatus} />
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Link to={`/dashboard/inspections/${scan.inspection_id || scan.id}`}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                            target="_blank" rel="noreferrer">
                            View <ExternalLink size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

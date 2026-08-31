import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminApprovals } from '../../services/api';
import {
  CheckSquare, Loader2, AlertCircle, RefreshCw,
  Clock, Package, ChevronRight, AlertTriangle,
} from 'lucide-react';

export default function AdminApprovals() {
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminApprovals()
      .then((d) => { setItems(d.items || []); setTotal(d.total || 0); })
      .catch(() => setError('Unable to load approval queue.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <CheckSquare size={20} className="text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Final Approval Queue</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Rejected products awaiting your final decision
            </p>
          </div>
          {total > 0 && (
            <span className="ml-2 inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-full text-sm font-bold bg-orange-500 text-white">
              {total}
            </span>
          )}
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

      {!loading && !error && items.length === 0 && (
        <div className="card p-16 text-center">
          <CheckSquare size={48} className="mx-auto text-emerald-300 mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">All clear!</h2>
          <p className="text-slate-500 text-sm">
            No products are pending final approval. Great work!
          </p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700">
              These products were automatically rejected by the compliance system.
              Review each one and give your final decision.
            </p>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejection Reason</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const primaryViolation = item.violations?.[0] || 'See full compliance report';
                    const extraCount = (item.violations?.length || 1) - 1;
                    return (
                      <tr key={item.inspection_id || item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            {item.image_urls?.[0] || item.original_image_path ? (
                              <img
                                src={item.image_urls?.[0] || item.original_image_path}
                                alt={item.product_name}
                                className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                <Package size={16} className="text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-800 truncate max-w-[160px]">{item.product_name || '—'}</p>
                              <p className="text-xs text-slate-400 font-mono">{item.inspection_id || item.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{item.inspector_name || '—'}</td>
                        <td className="px-4 py-4 text-slate-500 text-xs whitespace-nowrap">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td className="px-4 py-4 max-w-xs">
                          <div className="flex items-start gap-1">
                            <Clock size={12} className="text-rose-400 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs text-rose-700 line-clamp-2">{primaryViolation}</p>
                              {extraCount > 0 && (
                                <p className="text-xs text-slate-400 mt-0.5">+{extraCount} more violation{extraCount > 1 ? 's' : ''}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link to={`/admin/approvals/${item.inspection_id || item.id}`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition-colors">
                            Review <ChevronRight size={13} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

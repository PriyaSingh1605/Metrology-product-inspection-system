import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getAdminScans } from '../../services/api';
import {
  ClipboardList, Loader2, AlertCircle, RefreshCw,
  Search, Filter, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'REVIEW_REQUIRED', label: 'Review Required' },
];

const COMPLIANCE_BADGE = {
  APPROVED:        { label: 'Approved',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  REJECTED:        { label: 'Rejected',        cls: 'bg-rose-50 text-rose-700 border-rose-200'         },
  REVIEW_REQUIRED: { label: 'Review Required', cls: 'bg-amber-50 text-amber-700 border-amber-200'      },
};

const FINAL_BADGE = {
  NOT_REQUIRED: { label: '—',               cls: 'text-slate-400'                                          },
  PENDING:      { label: 'Pending',         cls: 'bg-orange-50 text-orange-700 border-orange-200 border rounded-full px-2.5 py-0.5' },
  APPROVED:     { label: 'Admin Approved',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 border rounded-full px-2.5 py-0.5' },
  REJECTED:     { label: 'Admin Rejected',  cls: 'bg-rose-50 text-rose-700 border-rose-200 border rounded-full px-2.5 py-0.5'  },
};

function Badge({ status, map }) {
  const cfg = map[status] || { label: status || '—', cls: 'text-slate-400' };
  return <span className={`text-xs font-semibold ${cfg.cls}`}>{cfg.label}</span>;
}

export default function AdminScans() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState(searchParams.get('status') || '');
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const searchRef             = useRef(null);

  // Keep the selected status synchronized with the sidebar URL.
  // This is important when navigating directly between Approved/Rejected scans.
  useEffect(() => {
    const urlStatus = new URLSearchParams(location.search).get('status') || '';
    setStatus(urlStatus);
    setPage(1);
  }, [location.search]);

  const load = useCallback((p = page) => {
    setLoading(true);
    setError('');
    getAdminScans({ search, status, page: p, limit: 20 })
      .then(setResult)
      .catch(() => setError('Unable to load scans.'))
      .finally(() => setLoading(false));
  }, [search, status, page]);

  // Reload when filters change
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => load(1), 300);
    return () => clearTimeout(timer);
  }, [search, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchKey = (e) => { if (e.key === 'Enter') { setPage(1); load(1); } };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <ClipboardList size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">All Scans</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {result.total > 0 ? `${result.total} total inspections` : 'Inspection records from all officers'}
            </p>
          </div>
        </div>
        <button onClick={() => load(page)} disabled={loading}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search by product, ID, manufacturer…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
        <div className="relative">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="pl-8 pr-8 py-2.5 text-sm border border-slate-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={() => load(1)} className="text-sm text-red-600 hover:underline font-medium">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden animate-fade-in">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {!loading && result.items.length === 0 && (
          <div className="py-20 text-center">
            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No inspections match your filters.</p>
          </div>
        )}

        {!loading && result.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Compliance</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Final Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.items.map((item) => (
                  <tr key={item.inspection_id || item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-slate-800 truncate max-w-[180px]">{item.product_name || '—'}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.inspection_id || item.id}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{item.inspector_name || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={item.complianceStatus} map={COMPLIANCE_BADGE} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={item.finalApprovalStatus} map={FINAL_BADGE} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {item.complianceStatus === 'REJECTED' && item.finalApprovalStatus === 'PENDING' ? (
                        <Link to={`/admin/approvals/${item.inspection_id || item.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 px-3 py-1.5 rounded-lg transition-colors">
                          Review
                        </Link>
                      ) : (
                        <Link to={`/inspections/${item.inspection_id || item.id}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                          target="_blank" rel="noreferrer">
                          <Eye size={12} />View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {result.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Page {result.page} of {result.pages} · {result.total} total
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={result.page <= 1}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage((p) => Math.min(result.pages, p + 1))} disabled={result.page >= result.pages}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

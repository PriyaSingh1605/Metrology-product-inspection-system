import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Search, PlusCircle, Loader2, AlertCircle, ClipboardX, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';

const statusConfig = {
  COMPLIANT:       { label: 'Compliant',       classes: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  NON_COMPLIANT:   { label: 'Non-Compliant',    classes: 'bg-rose-50 text-rose-700 border-rose-200' },
  REVIEW_REQUIRED: { label: 'Review Required', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const STATUS_OPTIONS = ['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'REVIEW_REQUIRED'];

function ComplianceBadge({ status }) {
  const cfg = statusConfig[status] || { label: status || 'Unknown', classes: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

export default function InspectionHistory() {
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await api.get('/api/inspections', { params });
      setInspections(data.items || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch {
      setError('Failed to load inspections.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);
  useEffect(() => { fetchInspections(); }, [fetchInspections]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inspection Archive</h1>
          <p className="text-slate-500 text-sm mt-1">{total} total inspection record{total !== 1 ? 's' : ''}</p>
        </div>
        <Link to="/dashboard/inspections/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
          <PlusCircle size={17} />New Inspection
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-input"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search product name, ID, manufacturer..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <div className="relative shrink-0">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : statusConfig[s]?.label || s}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        ) : inspections.length === 0 ? (
          <div className="py-24 text-center">
            <ClipboardX size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">
              {search || statusFilter !== 'ALL' ? 'No inspections match your filters.' : 'No inspections found.'}
            </p>
            {!search && statusFilter === 'ALL' && (
              <Link to="/dashboard/inspections/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                Create your first inspection
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Inspection ID', 'Product Name', 'Category', 'Manufacturer', 'Date', 'Compliance', 'Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inspections.map(item => (
                  <tr key={item.inspection_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">{item.inspection_id}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800 max-w-[180px] truncate">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{item.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 max-w-[140px] truncate">{item.manufacturer || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <ComplianceBadge status={item.compliance_status || item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/inspections/${item.inspection_id}`} className="text-sm text-blue-600 hover:underline font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={15} /> Previous
            </button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

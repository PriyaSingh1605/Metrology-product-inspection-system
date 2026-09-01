import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import {
  FileSearch, CalendarCheck, PlusCircle, Loader2, AlertCircle, Package,
  ShieldCheck, XCircle, AlertTriangle, TrendingUp, BarChart2
} from 'lucide-react';

const statusConfig = {
  COMPLIANT:       { label: 'Compliant',        color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  NON_COMPLIANT:   { label: 'Non-Compliant',     color: 'text-rose-600',    bg: 'bg-rose-50',    border: 'border-rose-200' },
  REVIEW_REQUIRED: { label: 'Review Required',  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200' },
};

function ComplianceBadge({ status }) {
  const cfg = statusConfig[status] || { label: status || 'Unknown', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-emerald-600 bg-emerald-50',
    red: 'text-rose-600 bg-rose-50',
    amber: 'text-amber-600 bg-amber-50',
  };
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} className={colorMap[color].split(' ')[0]} />
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value ?? '--'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setError('Could not load dashboard data. Ensure the AI service is running.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full py-32">
      <Loader2 size={36} className="animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Enforcement Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Legal Metrology (Packaged Commodities) Rules, 2011 — Compliance Overview</p>
        </div>
        <Link to="/dashboard/inspections/new" id="new-inspection-btn"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm">
          <PlusCircle size={17} />New Inspection
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {stats && (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FileSearch} label="Total Inspections" value={stats.total_inspections} sub="All time" color="blue" />
            <StatCard icon={CalendarCheck} label="Today's Scans" value={stats.today_inspections} sub="Since midnight" color="green" />
            <StatCard icon={ShieldCheck} label="Compliant" value={stats.compliant_count}
              sub={`${stats.compliance_rate ?? '--'}% compliance rate`} color="green" />
            <StatCard icon={XCircle} label="Non-Compliant" value={stats.non_compliant_count} sub="Requires action" color="red" />
          </div>

          {/* Violations Breakdown + Categories */}
          {(stats.violations_breakdown || stats.category_distribution) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Violation breakdown */}
              {stats.violations_breakdown && Object.keys(stats.violations_breakdown).length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart2 size={15} className="text-rose-500" />
                    <h2 className="text-sm font-bold text-slate-800">Top Violations</h2>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(stats.violations_breakdown)
                      .filter(([, v]) => v > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([k, v]) => {
                        const max = Math.max(...Object.values(stats.violations_breakdown));
                        const pct = max > 0 ? Math.round((v / max) * 100) : 0;
                        return (
                          <div key={k} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 truncate max-w-[70%]">{k}</span>
                              <span className="font-bold text-rose-600 ml-2">{v}</span>
                            </div>
                            <div className="progress-bar-track" style={{ height: 5 }}>
                              <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#f43f5e,#fb7185)' }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Category distribution */}
              {stats.category_distribution && Object.keys(stats.category_distribution).length > 0 && (
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={15} className="text-blue-500" />
                    <h2 className="text-sm font-bold text-slate-800">Inspections by Category</h2>
                  </div>
                  <div className="space-y-2.5">
                    {Object.entries(stats.category_distribution)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 6)
                      .map(([cat, count]) => {
                        const total = stats.total_inspections || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-600 truncate max-w-[70%]">{cat}</span>
                              <span className="font-bold text-blue-600 ml-2">{count}</span>
                            </div>
                            <div className="progress-bar-track" style={{ height: 5 }}>
                              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Inspections */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Recent Inspections</h2>
              <Link to="/dashboard/inspections" className="text-sm text-blue-600 hover:underline font-medium">View all</Link>
            </div>
            {!stats.recent_inspections?.length ? (
              <div className="py-16 text-center">
                <Package size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm">No inspections yet.</p>
                <Link to="/dashboard/inspections/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">Create your first inspection</Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {stats.recent_inspections.map((item) => (
                  <li key={item.inspection_id} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{item.product_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{item.inspection_id}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <ComplianceBadge status={item.compliance_status || item.status} />
                      <Link to={`/dashboard/inspections/${item.inspection_id}`} className="text-sm text-blue-600 hover:underline font-medium">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  LayoutDashboard, FileSearch, Users, ShieldCheck, XCircle,
  Clock, CalendarCheck, Loader2, AlertCircle, RefreshCw,
  TrendingUp, BarChart2, ArrowRight,
} from 'lucide-react';

const KPI_CONFIG = [
  { key: 'totalScans',          label: 'Total Scans',          icon: FileSearch,    color: 'blue'   },
  { key: 'approved',            label: 'Approved',             icon: ShieldCheck,   color: 'green'  },
  { key: 'rejected',            label: 'Rejected',             icon: XCircle,       color: 'red'    },
  { key: 'reviewRequired',      label: 'Review Required',       icon: Clock,         color: 'amber'  },
  { key: 'pendingFinalApproval',label: 'Pending Approval',     icon: Clock,         color: 'amber'  },
  { key: 'totalOfficers',       label: 'Total Officers',       icon: Users,         color: 'indigo' },
  { key: 'todayScans',          label: "Today's Scans",        icon: CalendarCheck, color: 'teal'   },
];

const COLOR_MAP = {
  blue:   { icon: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-100'   },
  green:  { icon: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-100'},
  red:    { icon: 'text-rose-600',   bg: 'bg-rose-50',    border: 'border-rose-100'   },
  amber:  { icon: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-100'  },
  indigo: { icon: 'text-indigo-600', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
  teal:   { icon: 'text-teal-600',   bg: 'bg-teal-50',    border: 'border-teal-100'   },
};

const PIE_COLORS = ['#10b981', '#f43f5e', '#f59e0b'];

function KpiCard({ kpi, value }) {
  const { icon: Icon, label, color } = kpi;
  const c = COLOR_MAP[color];
  return (
    <div className={`stat-card border ${c.border} animate-fade-in`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2.5 rounded-xl ${c.bg}`}>
          <Icon size={18} className={c.icon} />
        </div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="text-3xl font-bold text-slate-800">{value ?? '--'}</p>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-blue-600">{payload[0].value} scans</p>
      </div>
    );
  }
  return null;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminDashboard()
      .then(setData)
      .catch(() => setError('Unable to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 rounded-xl">
            <LayoutDashboard size={20} className="text-rose-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">System-wide compliance overview — all officers</p>
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
          <button onClick={load} className="text-sm text-red-600 hover:underline font-medium flex items-center gap-1">
            <RefreshCw size={13} />Retry
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
      )}

      {data && (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {KPI_CONFIG.map((kpi) => (
              <KpiCard key={kpi.key} kpi={kpi} value={data[kpi.key]} />
            ))}
          </div>

          {/* Pending Approvals CTA */}
          {data.pendingFinalApproval > 0 && (
            <Link to="/admin/approvals"
              className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl px-5 py-4 mb-8 shadow-md hover:shadow-lg transition-shadow animate-fade-in">
              <div className="flex items-center gap-3">
                <Clock size={20} />
                <div>
                  <p className="font-bold text-base">
                    {data.pendingFinalApproval} product{data.pendingFinalApproval !== 1 ? 's' : ''} awaiting final approval
                  </p>
                  <p className="text-amber-100 text-sm">Review rejected scans and take final action</p>
                </div>
              </div>
              <ArrowRight size={20} />
            </Link>
          )}

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Scan Trend */}
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={15} className="text-blue-500" />
                <h2 className="text-sm font-bold text-slate-800">Scan Activity — Last 30 Days</h2>
              </div>
              {data.dailyScans?.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.dailyScans} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }}
                      tickFormatter={(v) => v ? v.slice(5) : v} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2}
                      dot={{ r: 3, fill: '#2563eb' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No scan data for the last 30 days.
                </div>
              )}
            </div>

            {/* Compliance Distribution */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-5">
                <BarChart2 size={15} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">Compliance Distribution</h2>
              </div>
              {data.statusDistribution?.some((s) => s.count > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.statusDistribution} dataKey="count" nameKey="status"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                      {data.statusDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name) => [val, name]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No scan data yet.
                </div>
              )}
            </div>
          </div>

          {/* Officer Stats Table */}
          {data.officerStats?.length > 0 && (
            <div className="card overflow-hidden mb-8">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-slate-500" />
                  <h2 className="text-base font-semibold text-slate-800">Officer Performance</h2>
                </div>
                <Link to="/admin/officers" className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1">
                  View all <ArrowRight size={13} />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Officer</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rejected</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Review</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.officerStats.slice(0, 5).map((o) => (
                      <tr key={o.name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3">
                          <p className="font-medium text-slate-800">{o.name}</p>
                          <p className="text-xs text-slate-400">{o.email || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">{o.totalScans}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{o.approved}</td>
                        <td className="px-4 py-3 text-right text-rose-600 font-medium">{o.rejected}</td>
                        <td className="px-4 py-3 text-right text-amber-600 font-medium">{o.reviewRequired}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-400">
                          {o.lastScan ? new Date(o.lastScan).toLocaleDateString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

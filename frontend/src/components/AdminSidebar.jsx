import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { getAdminApprovals } from '../services/api';
import {
  LayoutDashboard, Users, ClipboardList, CheckSquare, LogOut,
  ShieldAlert, FileCheck, XCircle,
} from 'lucide-react';

export default function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  // Poll pending approvals count
  useEffect(() => {
    let mounted = true;
    const load = () => {
      getAdminApprovals()
        .then((d) => { if (mounted) setPendingCount(d.total || 0); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="bg-rose-600 rounded-xl p-2">
          <ShieldAlert size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">Admin Panel</p>
          <p className="text-xs text-slate-400">Legal Metrology System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavLink to="/admin" end
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={17} />Dashboard
        </NavLink>

        <NavLink to="/admin/officers"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <Users size={17} />Officers
        </NavLink>

        <NavLink to="/admin/scans"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={17} />All Scans
        </NavLink>

        <NavLink to="/admin/approvals"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} relative`}
        >
          <CheckSquare size={17} />
          Final Approvals
          {pendingCount > 0 && (
            <span className="ml-auto inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-xs font-bold bg-rose-500 text-white">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </NavLink>

        <div className="pt-3 pb-1">
          <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Quick Filters</p>
        </div>

        <NavLink to="/admin/scans?status=APPROVED"
          className={() => 'sidebar-link'}
        >
          <FileCheck size={17} className="text-emerald-400" />Approved Scans
        </NavLink>

        <NavLink to="/admin/scans?status=REJECTED"
          className={() => 'sidebar-link'}
        >
          <XCircle size={17} className="text-rose-400" />Rejected Scans
        </NavLink>
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center text-sm font-bold shrink-0 text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-rose-400 capitalize font-semibold">Administrator</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors">
          <LogOut size={17} />Logout
        </button>
      </div>
    </aside>
  );
}

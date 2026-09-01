import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, PlusCircle, ClipboardList, BookOpen, LogOut, ShieldCheck, House, UserRound,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',                 label: 'Dashboard',          icon: LayoutDashboard, end: true },
  { to: '/dashboard/inspections/new', label: 'New Inspection',     icon: PlusCircle },
  { to: '/dashboard/inspections',     label: 'Inspection Archive', icon: ClipboardList },
  { to: '/dashboard/guide',           label: 'Legal Guide',        icon: BookOpen },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="bg-blue-600 rounded-xl p-2">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">PackGuard AI</p>
          <p className="text-xs text-slate-400">Legal Metrology System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavLink to="/" end className="sidebar-link">
          <House size={17} />Back to Home
        </NavLink>
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-white/10 transition-colors" title="Open profile">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold shrink-0 text-white">
            {user?.name?.[0]?.toUpperCase() ?? 'O'}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.name || 'Officer'}</p>
            <p className="text-xs text-slate-400 capitalize flex items-center gap-1"><UserRound size={11} />{user?.role || 'Inspector'}</p>
          </div>
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-red-600 hover:text-white transition-colors">
          <LogOut size={17} />Logout
        </button>
      </div>
    </aside>
  );
}

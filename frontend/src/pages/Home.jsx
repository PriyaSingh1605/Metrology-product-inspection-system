import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, ClipboardCheck, FileSearch, ShieldCheck, UserRound } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const dashboardUrl = user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-36 right-0 w-[32rem] h-[32rem] bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl" />
      </div>
      <header className="relative max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-blue-600"><ShieldCheck size={22} /></span>
          <span><b className="block leading-tight">PackGuard AI</b><small className="text-slate-400">Legal Metrology Compliance</small></span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/profile" aria-label="Profile" className="p-2.5 text-slate-200 hover:bg-white/10 rounded-full transition-colors">
            <UserRound size={20} />
          </Link>
          <Link to={isAuthenticated ? dashboardUrl : '/login'} className="inline-flex items-center gap-2 bg-white text-slate-900 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors">
            {isAuthenticated ? 'Open Dashboard' : 'Login'} <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <p className="text-blue-300 font-semibold text-sm tracking-wide uppercase">Smart compliance inspections</p>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">Make packaged-product compliance clear and accountable.</h1>
          <p className="mt-6 text-lg text-slate-300 leading-8 max-w-2xl">PackGuard AI helps Legal Metrology officers scan product labels, extract required information, and review compliance results in one secure workspace.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to={isAuthenticated ? dashboardUrl : '/login'} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-5 py-3 rounded-xl font-semibold transition-colors">
              {isAuthenticated ? 'Go to dashboard' : 'Login to continue'} <ArrowRight size={17} />
            </Link>
            <Link to="/profile" className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-400 px-5 py-3 rounded-xl font-semibold text-slate-200 transition-colors">
              <UserRound size={17} /> Profile & website details
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-20">
          {[
            [FileSearch, 'Scan product labels', 'Upload product packaging images for AI-assisted label analysis.'],
            [ClipboardCheck, 'Review compliance', 'See approved, rejected, and review-required findings clearly.'],
            [ShieldCheck, 'Maintain accountability', 'Keep inspection history and officer activity organised for review.'],
          ].map(([Icon, title, description]) => (
            <div key={title} className="rounded-2xl bg-white/7 border border-white/10 p-6 backdrop-blur-sm">
              <Icon className="text-blue-300" size={25} />
              <h2 className="mt-5 font-bold text-lg">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

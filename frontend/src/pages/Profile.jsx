import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, BadgeCheck, LogIn, Mail, ShieldCheck, UserRound } from 'lucide-react';

export default function Profile() {
  const { isAuthenticated, user } = useAuth();
  const dashboardUrl = user?.role === 'admin' ? '/admin' : '/dashboard';
  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 mb-6"><ArrowLeft size={16} />Back to home</Link>
        <section className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-8 text-white">
            <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center"><UserRound size={31} /></div>
            <h1 className="mt-5 text-2xl font-bold">{isAuthenticated ? user?.name : 'Your PackGuard profile'}</h1>
            <p className="mt-1 text-slate-300">{isAuthenticated ? (user?.role === 'admin' ? 'System Administrator' : 'Legal Metrology Officer') : 'Sign in to view your account information.'}</p>
          </div>
          <div className="p-7">
            {isAuthenticated ? (
              <div className="grid sm:grid-cols-2 gap-4 mb-8">
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Name</p><p className="mt-1 font-semibold text-slate-800">{user?.name || '—'}</p></div>
                <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase text-slate-400">Email</p><p className="mt-1 font-semibold text-slate-800 break-all">{user?.email || '—'}</p></div>
              </div>
            ) : null}
            <div className="border-t border-slate-100 pt-7">
              <div className="flex items-center gap-2"><ShieldCheck size={20} className="text-blue-600" /><h2 className="font-bold text-slate-800">What PackGuard AI does</h2></div>
              <p className="mt-3 leading-7 text-slate-600">This platform supports Legal Metrology teams during packaged-commodity inspections. It processes label images, checks key declarations, records compliance outcomes, and gives officers and administrators a searchable inspection history.</p>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <p className="flex gap-2"><BadgeCheck size={17} className="text-emerald-600 shrink-0" />AI-assisted product label review</p>
                <p className="flex gap-2"><BadgeCheck size={17} className="text-emerald-600 shrink-0" />Approved, rejected, and review-required tracking</p>
                <p className="flex gap-2"><BadgeCheck size={17} className="text-emerald-600 shrink-0" />Officer and admin dashboards for accountability</p>
              </div>
            </div>
            <Link to={isAuthenticated ? dashboardUrl : '/login'} className="mt-8 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition-colors">
              {isAuthenticated ? 'Open dashboard' : 'Login'} {isAuthenticated ? <BadgeCheck size={17} /> : <LogIn size={17} />}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

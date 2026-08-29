import { XCircle, AlertTriangle } from 'lucide-react';

export default function ViolationsWarnings({ finalResult }) {
  const violations = finalResult?.violations || [];
  const warnings = finalResult?.warnings || [];

  if (!violations.length && !warnings.length) return null;

  return (
    <div className="space-y-3 animate-fade-in">
      {violations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-rose-50 border-b border-rose-100">
            <XCircle size={15} className="text-rose-500 shrink-0" />
            <h3 className="text-sm font-bold text-rose-700">
              Critical Violations ({violations.length})
            </h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {violations.map((v, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{v}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <h3 className="text-sm font-bold text-amber-700">
              Warnings & Advisories ({warnings.length})
            </h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {warnings.map((w, i) => (
              <li key={i} className="flex gap-3 px-4 py-3">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">{w}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

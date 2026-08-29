import { Ruler, CheckCircle2, XCircle, Eye } from 'lucide-react';

export default function FontSizeAnalysisCard({ fontAnalysis }) {
  if (!fontAnalysis) return null;

  const {
    net_quantity_height_mm,
    min_required_height_mm,
    font_size_compliant,
    readability_score,
    readability_compliant,
    rule_reference,
  } = fontAnalysis;

  const heightPercent = Math.min(
    100,
    min_required_height_mm > 0
      ? Math.round((net_quantity_height_mm / min_required_height_mm) * 100)
      : 100
  );

  return (
    <div className="card p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Ruler size={16} className="text-blue-500" />
        <h3 className="text-sm font-bold text-slate-800">Font Size & Readability Analysis</h3>
        <span className="ml-auto text-xs text-slate-400">{rule_reference || 'Rule 7 & Schedule'}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Net Quantity Font Height */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Qty Numeral Height</p>
            {font_size_compliant
              ? <CheckCircle2 size={14} className="text-emerald-500" />
              : <XCircle size={14} className="text-rose-500" />}
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold text-slate-800">{net_quantity_height_mm}</span>
            <span className="text-sm text-slate-500">mm</span>
            <span className="text-xs text-slate-400 ml-1">/ min {min_required_height_mm} mm required</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${heightPercent}%`,
                background: font_size_compliant
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : 'linear-gradient(90deg,#f43f5e,#fb7185)',
              }}
            />
          </div>
          <p className={`text-xs font-semibold mt-1.5 ${font_size_compliant ? 'text-emerald-600' : 'text-rose-600'}`}>
            {font_size_compliant ? '✓ Compliant' : '✗ Below minimum requirement'}
          </p>
        </div>

        {/* Readability Score */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Label Readability</p>
            <Eye size={14} className={readability_compliant ? 'text-emerald-500' : 'text-amber-500'} />
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-2xl font-bold text-slate-800">{readability_score ?? '--'}</span>
            <span className="text-sm text-slate-500">/ 100</span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${readability_score ?? 0}%`,
                background: readability_compliant
                  ? 'linear-gradient(90deg,#10b981,#34d399)'
                  : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
              }}
            />
          </div>
          <p className={`text-xs font-semibold mt-1.5 ${readability_compliant ? 'text-emerald-600' : 'text-amber-600'}`}>
            {readability_compliant ? '✓ Readable' : '⚠ Low contrast — advisory'}
          </p>
        </div>
      </div>
    </div>
  );
}

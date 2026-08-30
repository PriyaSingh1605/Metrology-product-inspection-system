import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Download, Award } from 'lucide-react';
import api from '../services/api';

const statusConfig = {
  COMPLIANT: {
    label: 'COMPLIANT',
    icon: CheckCircle2,
    className: 'compliant',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    iconColor: 'text-emerald-500',
  },
  NON_COMPLIANT: {
    label: 'NON-COMPLIANT',
    icon: XCircle,
    className: 'noncompliant',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    iconColor: 'text-rose-500',
  },
  REVIEW_REQUIRED: {
    label: 'REVIEW REQUIRED',
    icon: AlertTriangle,
    className: 'review',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    iconColor: 'text-amber-500',
  },
};

export default function ComplianceSummary({ data, onReset, inspectionId }) {
  const status = data?.final_result?.overall_status || 'REVIEW_REQUIRED';
  const cfg = statusConfig[status] || statusConfig.REVIEW_REQUIRED;
  const StatusIcon = cfg.icon;

  const violations = data?.final_result?.violations || [];
  const warnings = data?.final_result?.warnings || [];
  const ruleChecks = data?.rule_checks || {};
  const total = Object.keys(ruleChecks).length;
  const passed = Object.values(ruleChecks).filter(Boolean).length;

  const handlePdf = async () => {
    if (!inspectionId) return;
    try {
      const response = await api.get(`/api/inspections/${inspectionId}/pdf`, {
        responseType: 'blob',
        timeout: 30000,
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Legal_Metrology_Inspection_${inspectionId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('PDF generation failed. Ensure the AI service is running.');
    }
  };

  return (
    <div className={`compliance-banner ${cfg.className} animate-fade-in`}>
      <div className={`p-3 rounded-xl ${cfg.bg}`}>
        <StatusIcon size={28} className={cfg.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Award size={14} className={cfg.iconColor} />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Legal Metrology (Packaged Commodities) Rules, 2011
          </p>
        </div>
        <h2 className={`text-lg font-bold ${cfg.color}`}>
          {cfg.label}
        </h2>
        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
          <span>{passed}/{total} checks passed</span>
          {violations.length > 0 && (
            <span className="text-rose-500 font-semibold">{violations.length} violation{violations.length !== 1 ? 's' : ''}</span>
          )}
          {warnings.length > 0 && (
            <span className="text-amber-500 font-semibold">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          )}
          {inspectionId && (
            <span className="text-slate-400 font-mono">{inspectionId}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {inspectionId && (
          <button
            onClick={handlePdf}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
          >
            <Download size={13} />
            PDF Report
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
          >
            <RotateCcw size={13} />
            New Scan
          </button>
        )}
      </div>
    </div>
  );
}

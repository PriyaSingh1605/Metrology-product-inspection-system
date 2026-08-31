import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, Eye } from 'lucide-react';

export default function RawOcrViewer({ ocrText, visual }) {
  const [expanded, setExpanded] = useState(false);

  const avgConf = visual?.ocr_confidence;
  const confPct = avgConf != null ? Math.round(avgConf * 100) : null;

  if (!ocrText) return null;

  return (
    <div className="card overflow-hidden animate-fade-in">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
      >
        <FileText size={15} className="text-slate-400" />
        <span className="text-sm font-bold text-slate-700">Raw OCR Text & Confidence</span>
        {confPct != null && (
          <span className="ml-2 flex items-center gap-1 text-xs font-semibold text-slate-400">
            <Eye size={12} />
            {confPct}% avg. confidence
          </span>
        )}
        <span className="ml-auto">
          {expanded ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </span>
      </button>

      {expanded && (
        <div className="p-4">
          <div className="ocr-panel">
            {ocrText}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Text extracted by PaddleOCR across all uploaded packaging panels.
          </p>
        </div>
      )}
    </div>
  );
}

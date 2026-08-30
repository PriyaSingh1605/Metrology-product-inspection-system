import { useState } from 'react';
import { Images, ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

function QualityBadge({ q }) {
  if (!q) return null;
  const ok = q.overall_status === 'ready_for_ocr';
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
      ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
    }`}>
      {ok ? `Score ${q.overall_score ?? '--'}/100` : 'Quality Advisory'}
    </span>
  );
}

export default function MultiImageEvidenceViewer({ imageFiles, imageUrls, visual, quality }) {
  const [current, setCurrent] = useState(0);

  // Build image sources: prefer local File objects, fall back to server URLs
  const imageSrcs = imageFiles?.length
    ? imageFiles.map(f => URL.createObjectURL(f))
    : (imageUrls || []).map(u => u.startsWith('http') ? u : `${BASE_URL}/${u}`);

  if (!imageSrcs.length) return null;

  const total = imageSrcs.length;
  const perImageQuality = quality?.per_image || [];
  const currentQ = perImageQuality[current];

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
        <Images size={15} className="text-blue-500" />
        <h3 className="text-sm font-bold text-slate-800">Photographic Evidence</h3>
        <span className="ml-auto text-xs text-slate-400">
          {current + 1} / {total} panel{total > 1 ? 's' : ''}
        </span>
      </div>

      <div className="relative bg-slate-100">
        {imageSrcs[current] ? (
          <img
            src={imageSrcs[current]}
            alt={`Panel ${current + 1}`}
            className="w-full max-h-96 object-contain mx-auto block"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <ImageOff size={32} className="mb-2" />
            <p className="text-sm">Image not available</p>
          </div>
        )}

        {total > 1 && (
          <>
            <button
              onClick={() => setCurrent(c => Math.max(0, c - 1))}
              disabled={current === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
              disabled={current === total - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center disabled:opacity-30 hover:bg-white transition"
            >
              <ChevronRight size={15} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails + quality */}
      {total > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-slate-100">
          {imageSrcs.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-blue-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-90'
              }`}
            >
              <img src={src} alt={`Thumb ${i+1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {currentQ && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          <span>Panel {current + 1} quality:</span>
          <QualityBadge q={currentQ} />
          {currentQ?.message && <span className="text-slate-400">{currentQ.message}</span>}
        </div>
      )}
    </div>
  );
}

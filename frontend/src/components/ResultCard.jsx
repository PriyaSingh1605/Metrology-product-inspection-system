import { useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, RefreshCw, Upload } from 'lucide-react';

const CHECK_META = {
  resolution: { label: 'Resolution',  description: 'Minimum pixel dimensions for text readability' },
  sharpness:  { label: 'Sharpness',   description: 'Image focus & edge clarity (Laplacian variance)' },
  brightness: { label: 'Brightness',  description: 'Overall exposure level (grayscale mean)' },
  contrast:   { label: 'Contrast',    description: 'Tonal range of the image (grayscale std dev)' },
};

function CheckRow({ name, result }) {
  const meta = CHECK_META[name] || { label: name, description: '' };
  const passed = result?.status === 'pass';
  const skipped = result?.status === 'skipped';

  let scoreText = '';
  if (result?.score !== undefined) scoreText = `Score: ${result.score}`;
  if (result?.width !== undefined) scoreText = `${result.width}×${result.height} px`;

  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors
      ${passed ? 'bg-green-50 border-green-200' : skipped ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}
    >
      <div className="mt-0.5 shrink-0">
        {passed
          ? <CheckCircle2 size={20} className="text-green-600" />
          : skipped
          ? <AlertTriangle size={20} className="text-slate-400" />
          : <XCircle size={20} className="text-red-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{meta.label}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
            ${passed ? 'bg-green-100 text-green-700' : skipped ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'}`}
          >
            {passed ? '✓ Good' : skipped ? '— Skipped' : '✗ Poor'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">{meta.description}</p>
        {scoreText && (
          <p className="text-xs text-slate-400 mt-1 font-mono">{scoreText}</p>
        )}
        {!passed && !skipped && result?.reason && (
          <p className="text-xs text-red-600 mt-1.5 leading-relaxed">{result.reason}</p>
        )}
      </div>
    </div>
  );
}

export default function ResultCard({ result, imagePreview, imageNumber, onRetake, onUpload, onProceed, showProceed = true }) {
  const uploadInputRef = useRef(null);
  if (!result) return null;

  const ready = result.status === 'ready_for_ocr';
  const score = result.quality_score ?? 0;

  return (
    <div className="space-y-5">
      {imagePreview && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
            <p className="text-sm font-semibold text-slate-700">Image {imageNumber}</p>
            <span className={`text-xs font-bold ${ready ? 'text-green-600' : 'text-red-600'}`}>
              {ready ? 'Clear image' : 'Issue found'}
            </span>
          </div>
          <img src={imagePreview} alt={`Inspected product label ${imageNumber}`} className="h-56 w-full object-contain p-3" />
        </div>
      )}

      {/* Status banner */}
      <div className={`flex items-start gap-4 p-5 rounded-2xl border-2
        ${ready ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}
      >
        <div className={`p-2 rounded-xl shrink-0 ${ready ? 'bg-green-100' : 'bg-amber-100'}`}>
          {ready
            ? <CheckCircle2 size={28} className="text-green-600" />
            : <AlertTriangle size={28} className="text-amber-600" />
          }
        </div>
        <div className="flex-1">
          <h3 className={`text-lg font-bold ${ready ? 'text-green-800' : 'text-amber-800'}`}>
            {ready ? '✓ Image Ready for OCR' : '⚠ Image Needs Retake'}
          </h3>
          <p className={`text-sm mt-1 ${ready ? 'text-green-700' : 'text-amber-700'}`}>
            {result.message}
          </p>
        </div>

        {/* Quality score circle */}
        <div className="shrink-0 flex flex-col items-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 font-bold text-lg
            ${ready ? 'border-green-400 text-green-700 bg-white' : 'border-amber-400 text-amber-700 bg-white'}`}
          >
            {score}
          </div>
          <span className="text-xs text-slate-500 mt-1">Score</span>
        </div>
      </div>

      {/* Individual check results */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quality Checks
        </p>
        <div className="space-y-2.5">
          {Object.entries(result.checks || {}).map(([key, val]) => (
            <CheckRow key={key} name={key} result={val} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          id="retake-image-btn"
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={16} />
          Retake Image
        </button>
        {!ready && onUpload && (
          <>
            <button
              id="upload-replacement-btn"
              onClick={() => uploadInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 border border-blue-300 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <Upload size={16} />
              Upload Image
            </button>
            <input
              ref={uploadInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => {
                onUpload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </>
        )}
        {ready && showProceed && (
          <button
            id="proceed-to-form-btn"
            onClick={onProceed}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            Proceed to Inspection Form
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

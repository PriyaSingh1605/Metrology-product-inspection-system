import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Camera, Upload, Loader2, AlertCircle,
  CheckCircle2, Scan, FileText, Zap, Shield
} from 'lucide-react';
import api, { analyzeMultipleImagesQuality } from '../services/api';
import CameraCapture from '../components/CameraCapture';
import ResultCard from '../components/ResultCard';
import ComplianceSummary from '../components/ComplianceSummary';
import ViolationsWarnings from '../components/ViolationsWarnings';
import FontSizeAnalysisCard from '../components/FontSizeAnalysisCard';
import ProductDetailsCard from '../components/ProductDetailsCard';
import RuleChecksTable from '../components/RuleChecksTable';
import RawOcrViewer from '../components/RawOcrViewer';
import MultiImageEvidenceViewer from '../components/MultiImageEvidenceViewer';

const CATEGORIES = [
  'Food & Beverages', 'Personal Care', 'Household Cleaning', 'Pharmaceuticals',
  'Cosmetics', 'Electronics', 'Textiles', 'Agricultural Products', 'Industrial Products', 'Other',
];

const LOADING_STAGES = [
  'Uploading product packaging images...',
  'Running OpenCV resolution, blur & contrast checks...',
  'Executing PaddleOCR multi-panel text extraction...',
  'Extracting structured declarations via Groq LLM...',
  'Evaluating Legal Metrology (Packaged Commodities) Rules 2011...',
  'Generating compliance report...',
];

// ── Step 1: Image Capture & Quality Check ──────────────────────────────────────
function ImageStep({ onQualityPassed }) {
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [stage, setStage] = useState('idle');
  const [qualityResults, setQualityResults] = useState([]);
  const [apiError, setApiError] = useState('');
  const fileRef = useRef();

  const addFiles = (selected) => {
    const next = [...files, ...selected].slice(0, 5);
    setFiles(next);
    setPreviews(next.map(f => URL.createObjectURL(f)));
    setStage('idle');
    setQualityResults([]);
    setApiError('');
  };

  const handleCameraCapture = (f) => {
    setShowCamera(false);
    if (retakeIndex !== null) {
      const next = files.map((file, i) => i === retakeIndex ? f : file);
      setFiles(next);
      setPreviews(next.map(file => URL.createObjectURL(file)));
      setQualityResults([]);
      setStage('idle');
      setApiError('');
      setRetakeIndex(null);
    } else {
      addFiles([f]);
    }
  };

  const handleAnalyze = async () => {
    if (!files.length) return;
    setStage('analyzing');
    setApiError('');
    try {
      const data = await analyzeMultipleImagesQuality(files);
      const results = data.results || [];
      setQualityResults(results);
      setStage('result');
    } catch (err) {
      setApiError(err.response?.data?.error || err.response?.data?.detail || 'Failed to analyze image quality.');
      setStage('idle');
    }
  };

  const handleRetake = () => { setFiles([]); setPreviews([]); setStage('idle'); setQualityResults([]); setApiError(''); };

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) addFiles(selected);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
    if (dropped.length) addFiles(dropped);
  };

  return (
    <div className="space-y-5">
      {/* Step indicators */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</div>
          <span className="text-sm font-semibold text-blue-700">Image Quality Check</span>
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 text-xs font-bold flex items-center justify-center">2</div>
          <span className="text-sm text-slate-400">Inspection Details</span>
        </div>
      </div>

      <p className="text-sm text-slate-500">
        Upload up to 5 packaging panel images (front, back, sides). Better coverage = more accurate results.
      </p>

      {/* Upload zone */}
      {stage === 'idle' && files.length < 5 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowCamera(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <Camera size={18} className="text-blue-500" />Capture Camera
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-all"
            >
              <Upload size={18} className="text-blue-500" />Upload File
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileInput} className="hidden" />
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="drop-zone"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Drag & drop images here or click to browse</p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — up to 10 MB each</p>
          </div>
        </div>
      )}

      {/* Previews */}
      {files.length > 0 && stage !== 'analyzing' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                <img src={src} alt={`Panel ${i+1}`} className="w-full h-20 object-cover rounded-lg border border-slate-200" />
                <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">P{i+1}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{files.length} image{files.length !== 1 ? 's' : ''} selected</span>
            <button onClick={handleRetake} className="text-xs text-slate-500 hover:text-slate-700 underline">Clear all</button>
          </div>
        </div>
      )}

      {/* Error */}
      {apiError && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {/* Analyzing */}
      {stage === 'analyzing' && (
        <div className="flex flex-col items-center py-8 gap-3">
          <Loader2 size={28} className="animate-spin text-blue-600" />
          <p className="text-sm text-slate-600 font-medium">Checking image quality...</p>
        </div>
      )}

      {/* Results */}
      {stage === 'result' && qualityResults.length > 0 && (
        <div className="space-y-3">
          {qualityResults.map((r, i) => (
            <ResultCard key={i} result={r} imagePreview={previews[i]} imageNumber={i + 1} onRetake={() => { setRetakeIndex(i); setShowCamera(true); }} showProceed={false} />
          ))}
          {qualityResults.every(r => r.status === 'ready_for_ocr') && (
            <button
              onClick={() => onQualityPassed(files, qualityResults)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={16} />
              Continue to Inspection Details
            </button>
          )}
        </div>
      )}

      {/* Analyze button */}
      {files.length > 0 && stage === 'idle' && (
        <button
          onClick={handleAnalyze}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Scan size={16} />Analyze Image Quality
        </button>
      )}

      {showCamera && <CameraCapture onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </div>
  );
}

// ── Step 2: Inspection Details Form ────────────────────────────────────────────
function InspectionForm({ imageFiles, qualityResults, onBack }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ product_name: '', category: '', manufacturer: '', location: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [inspectionId, setInspectionId] = useState(null);

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.product_name.trim()) { setError('Product name is required.'); return; }
    setError('');
    setLoading(true);
    setResult(null);

    // Progressive loading stages
    let stageIdx = 0;
    setLoadingStage(LOADING_STAGES[0]);
    const stageTimer = setInterval(() => {
      stageIdx = Math.min(stageIdx + 1, LOADING_STAGES.length - 1);
      setLoadingStage(LOADING_STAGES[stageIdx]);
    }, 4000);

    try {
      const fd = new FormData();
      fd.append('product_name', form.product_name.trim());
      if (form.category) fd.append('category', form.category);
      if (form.manufacturer) fd.append('manufacturer', form.manufacturer);
      if (form.location) fd.append('location', form.location);
      if (form.notes) fd.append('notes', form.notes);
      imageFiles.forEach(f => fd.append('image', f));

      const { data } = await api.post('/api/inspections', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });

      clearInterval(stageTimer);

      const insp = data.inspection || data;
      setInspectionId(insp.inspection_id);
      setResult({
        final_result: {
          overall_status: insp.compliance_status,
          violations: insp.violations || [],
          warnings: insp.warnings || [],
        },
        product_information: insp.product_information,
        rule_checks: insp.rule_checks,
        font_analysis: insp.font_analysis,
        visual_analysis: insp.visual_analysis,
        quality_analysis: insp.quality_analysis,
        ocr_text: insp.ocr_text,
      });
    } catch (err) {
      clearInterval(stageTimer);
      setError(
        err.response?.data?.error || err.response?.data?.detail ||
        'Compliance analysis failed. Ensure the Python AI service is running on port 8000.'
      );
    } finally {
      setLoading(false);
      setLoadingStage('');
    }
  };

  // ── Results view ─────────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="space-y-4">
        <ComplianceSummary
          data={result}
          onReset={() => { setResult(null); setInspectionId(null); }}
          inspectionId={inspectionId}
        />
        <ViolationsWarnings finalResult={result.final_result} />
        <FontSizeAnalysisCard fontAnalysis={result.font_analysis} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ProductDetailsCard product={result.product_information} />
          <RuleChecksTable rules={result.rule_checks} />
        </div>
        <MultiImageEvidenceViewer
          imageFiles={imageFiles}
          visual={result.visual_analysis}
          quality={result.quality_analysis}
          ocrText={result.ocr_text}
        />
        <RawOcrViewer ocrText={result.ocr_text} visual={result.visual_analysis} />
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/inspections/${inspectionId}`)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <FileText size={14} />View Full Report
          </button>
          <button onClick={() => navigate('/')} className="px-4 py-2.5 border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700 rounded-lg transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ── Loading view ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-5 py-12">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
          <Shield size={22} className="absolute inset-0 m-auto text-blue-600" />
        </div>
        <div className="text-center space-y-1.5">
          <p className="text-sm font-bold text-slate-800">Running AI Compliance Analysis</p>
          <p className="text-xs text-slate-400 animate-pulse-glow max-w-xs">{loadingStage}</p>
        </div>
        <div className="flex gap-2 text-xs text-slate-400">
          {['OCR', 'LLM', 'Rules', 'PDF'].map((s, i) => (
            <span key={s} className="flex items-center gap-1">
              <Zap size={10} className="text-blue-400" />{s}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">✓</div>
          <span className="text-sm text-emerald-700 font-semibold">Image Quality Check</span>
        </div>
        <div className="flex-1 h-px bg-blue-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</div>
          <span className="text-sm font-semibold text-blue-700">Inspection Details</span>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
        <p className="text-sm text-emerald-700 font-medium">
          Image quality verified — {imageFiles.length} panel{imageFiles.length !== 1 ? 's' : ''} ready for OCR
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Product Name <span className="text-red-500">*</span></label>
          <input id="product_name" name="product_name" type="text" value={form.product_name} onChange={handleChange} required
            placeholder="e.g. Maggi Noodles 70g" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select id="category" name="category" value={form.category} onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Select category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Brand / Manufacturer</label>
            <input id="manufacturer" name="manufacturer" type="text" value={form.manufacturer} onChange={handleChange}
              placeholder="e.g. Nestlé India Ltd" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Inspection Location</label>
          <input id="location" name="location" type="text" value={form.location} onChange={handleChange}
            placeholder="e.g. Karol Bagh Market, Delhi" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Observations</label>
          <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3}
            placeholder="Additional inspector notes..." className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <div className="flex justify-between gap-3 pt-2">
          <button type="button" onClick={onBack} className="flex items-center gap-1 px-5 py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            <ChevronLeft size={16} /> Back
          </button>
          <button id="submit-inspection-btn" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
            <Shield size={15} />
            Run Compliance Scan
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function NewInspection() {
  const navigate = useNavigate();
  const [step, setStep] = useState('image');
  const [capturedFiles, setCapturedFiles] = useState([]);
  const [qualityResults, setQualityResults] = useState([]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors">
        <ChevronLeft size={16} /> Back
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">New Product Inspection</h1>
      <p className="text-slate-500 text-sm mb-6">
        Upload product label images for automated Legal Metrology (PC) Rules, 2011 compliance analysis.
      </p>

      <div className="card p-6">
        {step === 'image' && (
          <ImageStep onQualityPassed={(files, results) => { setCapturedFiles(files); setQualityResults(results); setStep('form'); }} />
        )}
        {step === 'form' && capturedFiles.length > 0 && (
          <InspectionForm imageFiles={capturedFiles} qualityResults={qualityResults} onBack={() => setStep('image')} />
        )}
      </div>
    </div>
  );
}

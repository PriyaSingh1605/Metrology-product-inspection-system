import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Loader2, AlertCircle, ChevronLeft, Trash2, UserRound, CalendarDays } from 'lucide-react';
import ComplianceSummary from '../components/ComplianceSummary';
import ViolationsWarnings from '../components/ViolationsWarnings';
import FontSizeAnalysisCard from '../components/FontSizeAnalysisCard';
import ProductDetailsCard from '../components/ProductDetailsCard';
import RuleChecksTable from '../components/RuleChecksTable';
import RawOcrViewer from '../components/RawOcrViewer';
import MultiImageEvidenceViewer from '../components/MultiImageEvidenceViewer';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function InspectionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get(`/api/inspections/${id}`)
      .then(({ data }) => setInspection(data))
      .catch(() => setError('Inspection not found or failed to load.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Delete this inspection? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/api/inspections/${id}`);
      navigate('/dashboard/inspections');
    } catch {
      setError('Failed to delete inspection.');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 size={36} className="animate-spin text-blue-600" />
    </div>
  );

  if (error || !inspection) return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-4">
        <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700">{error || 'Inspection not found.'}</p>
      </div>
    </div>
  );

  // Normalize data for components
  const complianceData = {
    final_result: {
      overall_status: inspection.compliance_status,
      violations: inspection.violations || [],
      warnings: inspection.warnings || [],
    },
    rule_checks: inspection.rule_checks,
    font_analysis: inspection.font_analysis,
    visual_analysis: inspection.visual_analysis,
    quality_analysis: inspection.quality_analysis,
    product_information: inspection.product_information,
    ocr_text: inspection.ocr_text,
  };

  const createdAt = new Date(inspection.created_at || inspection.createdAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const imageUrls = inspection.image_urls?.length
    ? inspection.image_urls
    : (inspection.image_paths || (inspection.original_image_path ? [inspection.original_image_path] : []));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors">
            <ChevronLeft size={16} />Back
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{inspection.product_name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
            <span className="font-mono">{inspection.inspection_id}</span>
            <span>·</span>
            <span>{createdAt}</span>
            {inspection.location && <><span>·</span><span>{inspection.location}</span></>}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5"><UserRound size={15} className="text-blue-600" />Checked by: <b>{inspection.inspector_name || '—'}</b></span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} className="text-blue-600" />Checked on: <b>{createdAt}</b></span>
          </div>
        </div>
        <button id="delete-btn" onClick={handleDelete} disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors">
          {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}Delete
        </button>
      </div>

      <div className="space-y-4">
        {/* Compliance Summary */}
        {inspection.compliance_status && (
          <ComplianceSummary
            data={complianceData}
            inspectionId={inspection.inspection_id}
          />
        )}

        {/* Violations & Warnings */}
        <ViolationsWarnings finalResult={complianceData.final_result} />

        {/* Font Analysis */}
        {inspection.font_analysis && <FontSizeAnalysisCard fontAnalysis={inspection.font_analysis} />}

        {/* Details grid */}
        {(inspection.product_information || inspection.rule_checks) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inspection.product_information && <ProductDetailsCard product={inspection.product_information} />}
            {inspection.rule_checks && <RuleChecksTable rules={inspection.rule_checks} />}
          </div>
        )}

        {/* Basic info if no AI data */}
        {!inspection.compliance_status && (
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Inspection Details</h2>
            {[
              ['Inspection ID', inspection.inspection_id],
              ['Product Name', inspection.product_name],
              ['Category', inspection.category],
              ['Manufacturer', inspection.manufacturer],
              ['Location', inspection.location],
              ['Inspector', inspection.inspector_name],
              ['Date', createdAt],
            ].map(([label, val]) => val ? (
              <div key={label} className="flex gap-4 py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-400 w-36 shrink-0">{label}</span>
                <span className="text-sm text-slate-800 font-medium">{val}</span>
              </div>
            ) : null)}
          </div>
        )}

        {/* Evidence viewer */}
        {imageUrls.length > 0 && (
          <MultiImageEvidenceViewer
            imageUrls={imageUrls}
            visual={inspection.visual_analysis}
            quality={inspection.quality_analysis}
          />
        )}

        {/* Raw OCR */}
        {inspection.ocr_text && <RawOcrViewer ocrText={inspection.ocr_text} visual={inspection.visual_analysis} />}
      </div>
    </div>
  );
}

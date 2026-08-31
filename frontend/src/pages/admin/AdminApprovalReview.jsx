import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getAdminApprovalById, approveInspection, rejectInspection } from '../../services/api';
import {
  ArrowLeft, Loader2, AlertCircle, RefreshCw,
  ShieldCheck, XCircle, Package, User, Calendar,
  FileText, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide w-40 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700 flex-1">{String(value)}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="card p-6">
      <div className={`flex items-center gap-2 mb-4 pb-3 border-b border-slate-100`}>
        <Icon size={16} className={iconColor} />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function AdminApprovalReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [comment, setComment]     = useState('');
  const [showAllViolations, setShowAllViolations] = useState(false);
  const [showOcr, setShowOcr]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getAdminApprovalById(id)
      .then(setData)
      .catch((err) => {
        const msg = err.response?.data?.error || 'Unable to load inspection data.';
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    if (!confirm('Confirm: Grant final approval for this product?')) return;
    setSubmitting(true);
    setActionError('');
    try {
      await approveInspection(id);
      navigate('/admin/approvals', { state: { flash: 'Product approved successfully.' } });
    } catch (err) {
      setActionError(err.response?.data?.error || 'Approval failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim()) {
      setActionError('Please enter an admin comment before confirming rejection.');
      return;
    }
    setSubmitting(true);
    setActionError('');
    try {
      await rejectInspection(id, comment.trim());
      navigate('/admin/approvals', { state: { flash: 'Product rejected.' } });
    } catch (err) {
      setActionError(err.response?.data?.error || 'Rejection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const productInfo = data?.product_information || {};
  const violations  = data?.violations || [];
  const warnings    = data?.warnings || [];
  const images      = data?.image_urls || (data?.original_image_path ? [data.original_image_path] : []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back nav */}
      <Link to="/admin/approvals"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-6">
        <ArrowLeft size={15} />Back to Approval Queue
      </Link>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <Loader2 size={36} className="animate-spin text-blue-600" />
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-4 mb-6">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{error}</p>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-red-600 hover:underline font-medium">
            <RefreshCw size={13} />Retry
          </button>
        </div>
      )}

      {data && (
        <div className="space-y-5 animate-fade-in">
          {/* Page title */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{data.product_name || 'Product Review'}</h1>
              <p className="text-slate-500 text-sm mt-1 font-mono">{data.inspection_id || data.id}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold bg-orange-100 text-orange-700 border border-orange-200 shrink-0">
              <AlertTriangle size={13} />Pending Review
            </span>
          </div>

          {/* Product Images */}
          {images.length > 0 && (
            <SectionCard title="Product Images" icon={Package} iconColor="text-slate-500">
              <div className="flex gap-3 flex-wrap">
                {images.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Product image ${i + 1}`}
                      className="w-36 h-36 object-cover rounded-xl border border-slate-200 hover:border-blue-400 transition-colors"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </a>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Inspection Meta */}
            <SectionCard title="Inspection Details" icon={User} iconColor="text-blue-500">
              <InfoRow label="Officer" value={data.inspector_name} />
              <InfoRow label="Category" value={data.category} />
              <InfoRow label="Location" value={data.location} />
              <InfoRow label="Date & Time" value={data.created_at ? new Date(data.created_at).toLocaleString('en-IN') : null} />
              {data.notes && <InfoRow label="Officer Notes" value={data.notes} />}
            </SectionCard>

            {/* Extracted Product Info */}
            <SectionCard title="Extracted Information" icon={FileText} iconColor="text-indigo-500">
              {Object.keys(productInfo).length > 0 ? (
                <>
                  <InfoRow label="Manufacturer" value={productInfo.manufacturer_name || data.manufacturer} />
                  <InfoRow label="Net Quantity" value={productInfo.net_quantity} />
                  <InfoRow label="MRP" value={productInfo.mrp} />
                  <InfoRow label="Manufacturing Date" value={productInfo.manufacturing_date || productInfo.date_of_manufacture} />
                  <InfoRow label="Expiry Date" value={productInfo.expiry_date || productInfo.best_before} />
                  <InfoRow label="Consumer Care" value={productInfo.consumer_care} />
                  <InfoRow label="FSSAI / Lic. No." value={productInfo.fssai_license || productInfo.license_number} />
                  <InfoRow label="Batch No." value={productInfo.batch_number} />
                  <InfoRow label="Country of Origin" value={productInfo.country_of_origin} />
                </>
              ) : (
                <p className="text-slate-400 text-sm">No product information extracted.</p>
              )}
            </SectionCard>
          </div>

          {/* Compliance Result */}
          <SectionCard title="System Compliance Decision" icon={AlertTriangle} iconColor="text-rose-500">
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4">
              <XCircle size={20} className="text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-rose-700">System Decision: REJECTED</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  The automated compliance engine found the following violations:
                </p>
              </div>
            </div>

            {violations.length > 0 ? (
              <ul className="space-y-2">
                {(showAllViolations ? violations : violations.slice(0, 4)).map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-rose-400 mt-1 shrink-0">•</span>
                    <span className="text-slate-700">{v}</span>
                  </li>
                ))}
                {violations.length > 4 && (
                  <button onClick={() => setShowAllViolations((s) => !s)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                    {showAllViolations ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />+{violations.length - 4} more violations</>}
                  </button>
                )}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm">No violation details recorded.</p>
            )}

            {warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Warnings</p>
                <ul className="space-y-1.5">
                  {warnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-amber-700">
                      <span className="text-amber-400 mt-0.5 shrink-0">▲</span>{w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* OCR Text collapsible */}
            {data.ocr_text && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => setShowOcr((s) => !s)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                  {showOcr ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {showOcr ? 'Hide' : 'Show'} raw OCR text
                </button>
                {showOcr && (
                  <div className="ocr-panel mt-2 max-h-48">{data.ocr_text}</div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Admin Action */}
          <SectionCard title="Admin Final Decision" icon={CheckCircle2} iconColor="text-blue-600">
            {actionError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-sm text-red-700">{actionError}</p>
              </div>
            )}

            {data.finalApprovalStatus && data.finalApprovalStatus !== 'PENDING' && data.finalApprovalStatus !== 'NOT_REQUIRED' ? (
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                data.finalApprovalStatus === 'APPROVED'
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}>
                {data.finalApprovalStatus === 'APPROVED'
                  ? <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                  : <XCircle size={20} className="text-rose-600 shrink-0" />
                }
                <div>
                  <p className={`font-bold ${data.finalApprovalStatus === 'APPROVED' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Final Decision: {data.finalApprovalStatus}
                  </p>
                  {data.reviewedAt && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Reviewed on {new Date(data.reviewedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                  {data.adminComment && (
                    <p className="text-sm text-slate-600 mt-1 italic">"{data.adminComment}"</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">
                  This product was rejected by the automated system. Review the information above and decide:
                </p>

                {/* Action buttons */}
                {!showRejectForm && (
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleApprove} disabled={submitting}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm">
                      {submitting
                        ? <Loader2 size={16} className="animate-spin" />
                        : <ShieldCheck size={16} />
                      }
                      Grant Final Approval
                    </button>
                    <button onClick={() => { setShowRejectForm(true); setActionError(''); }}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors shadow-sm">
                      <XCircle size={16} />Confirm Rejection
                    </button>
                  </div>
                )}

                {/* Rejection comment form */}
                {showRejectForm && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-rose-700">
                      You are about to confirm rejection. Please provide a reason:
                    </p>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Admin Comment <span className="text-rose-500">*</span></span>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        placeholder="Explain your final rejection decision…"
                        className="mt-1.5 w-full px-3 py-2.5 text-sm border border-rose-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent transition resize-none"
                      />
                    </label>
                    <div className="flex gap-3">
                      <button onClick={handleReject} disabled={submitting || !comment.trim()}
                        className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        Confirm Rejection
                      </button>
                      <button onClick={() => { setShowRejectForm(false); setComment(''); setActionError(''); }}
                        disabled={submitting}
                        className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      )}
    </div>
  );
}

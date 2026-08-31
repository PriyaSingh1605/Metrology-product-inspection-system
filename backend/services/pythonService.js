/**
 * pythonService.js
 * ─────────────────
 * Proxy helpers for all interactions with the Python FastAPI ai-service.
 * - Image quality check
 * - Full compliance inspection (OCR + Groq LLM + Rule Engine)
 * - PDF report generation
 * - Dashboard stats & inspection CRUD
 */

const axios = require('axios');
const FormData = require('form-data');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

// ── Image quality pre-check ────────────────────────────────────────────────────
const analyzeImageQuality = async (buffer, filename, mimetype) => {
  const form = new FormData();
  form.append('image', buffer, { filename, contentType: mimetype });

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/image/check`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (err) {
    return _handleProxyError(err, 'Image quality check');
  }
};

// ── Image quality pre-check (multi-image) ──────────────────────────────────────
const analyzeMultipleImagesQuality = async (files) => {
  const form = new FormData();
  for (const file of files) {
    form.append('images', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/image/quality`, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    });
    return response.data;
  } catch (err) {
    return _handleProxyError(err, 'Image quality check');
  }
};

// ── Full compliance inspection (multi-image) ───────────────────────────────────
const createComplianceInspection = async (files, fields) => {
  const form = new FormData();
  form.append('product_name', fields.product_name);
  if (fields.category) form.append('category', fields.category);
  if (fields.manufacturer) form.append('manufacturer', fields.manufacturer);
  if (fields.location) form.append('location', fields.location);
  if (fields.notes) form.append('notes', fields.notes);
  if (fields.inspector_name) form.append('inspector_name', fields.inspector_name);
  if (fields.user_id) form.append('user_id', fields.user_id);

  for (const file of files) {
    form.append('images', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  try {
    const response = await axios.post(`${PYTHON_SERVICE_URL}/api/inspections`, form, {
      headers: form.getHeaders(),
      timeout: 240000, // 4 minutes for multi-image OCR + LLM pipeline
    });
    return response.data;
  } catch (err) {
    return _handleProxyError(err, 'Compliance analysis');
  }
};

// ── Get inspections from Python store ─────────────────────────────────────────
const getInspections = async (params = {}) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/inspections`, {
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    return _handleProxyError(err, 'List inspections');
  }
};

// ── Get single inspection from Python ─────────────────────────────────────────
const getInspectionById = async (id, params = {}) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/inspections/${id}`, {
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    return _handleProxyError(err, 'Get inspection');
  }
};

// ── Delete inspection from Python store ───────────────────────────────────────
const deleteInspection = async (id, params = {}) => {
  try {
    const response = await axios.delete(`${PYTHON_SERVICE_URL}/api/inspections/${id}`, {
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    return _handleProxyError(err, 'Delete inspection');
  }
};

// ── Fetch dashboard stats from Python ─────────────────────────────────────────
const getDashboardStats = async (params = {}) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/dashboard/stats`, {
      params,
      timeout: 15000,
    });
    return response.data;
  } catch (err) {
    return _handleProxyError(err, 'Dashboard stats');
  }
};

// ── Stream PDF report from Python ─────────────────────────────────────────────
const streamPdfReport = async (id, params = {}) => {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/inspections/${id}/pdf`, {
      params,
      responseType: 'stream',
      timeout: 30000,
    });
    return response;
  } catch (err) {
    if (err.response?.status === 404) return null;
    return _handleProxyError(err, 'PDF generation');
  }
};

// ── Error handler ──────────────────────────────────────────────────────────────
function _handleProxyError(err, context) {
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    const e = new Error(`${context}: AI service is unavailable. Ensure the Python service is running on port 8000.`);
    e.statusCode = 503;
    throw e;
  }
  if (err.response) {
    const detail = err.response.data?.detail || err.response.data?.message || `${context} failed.`;
    const e = new Error(detail);
    e.statusCode = err.response.status || 500;
    throw e;
  }
  if (err.code === 'ECONNABORTED') {
    const e = new Error(`${context} timed out. The service may be busy — please try again.`);
    e.statusCode = 504;
    throw e;
  }
  throw err;
}

module.exports = {
  analyzeImageQuality,
  analyzeMultipleImagesQuality,
  createComplianceInspection,
  getInspections,
  getInspectionById,
  deleteInspection,
  getDashboardStats,
  streamPdfReport,
};

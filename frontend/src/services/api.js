import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 180000, // 3 minutes — accommodates full OCR + LLM pipeline
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── API Helpers ───────────────────────────────────────────────────────────────

/**
 * Analyze image quality via /api/image/check
 * @param {File} file
 * @returns {Promise<object>}
 */
export const analyzeImageQuality = (file) => {
  const fd = new FormData();
  fd.append('image', file);
  return api.post('/api/image/check', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then(({ data }) => (Array.isArray(data) ? data[0] : data));
};

/**
 * Analyze 1-5 images in a single quality-check request.
 * @param {File[]} files
 */
export const analyzeMultipleImagesQuality = (files) => {
  const fd = new FormData();
  files.forEach((file) => fd.append('images', file));
  return api.post('/api/image/quality', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  }).then(({ data }) => data);
};

/**
 * Download PDF compliance report using authenticated request
 * @param {string} inspectionId
 */
export const downloadPdfReport = async (inspectionId) => {
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
};

export { BASE_URL };
export default api;

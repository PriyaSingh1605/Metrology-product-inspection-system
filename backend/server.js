/**
 * server.js — Legal Metrology Complliance System: Main Backend
 * ────────────────────────────────────────────────────────────
 * Node.js + Express application server.
 * Handles: Auth (JWT), Inspections (CRUD), Dashboard, Image quality forwarding.
 * Connects to MongoDB via Mongoose.
 * Image quality analysis is delegated to the Python/FastAPI ai-service.
 */

require('dotenv').config();

if (!process.env.JWT_SECRET_KEY) {
  throw new Error('JWT_SECRET_KEY is required. Copy backend/.env.example to backend/.env and set a secret.');
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');

const authRoutes = require('./routes/authRoutes');
const inspectionRoutes = require('./routes/inspectionRoutes');
const imageRoutes = require('./routes/imageRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────────────
const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin: corsOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static: serve uploaded images ────────────────────────────────────────────
// Images are stored by the Python ai-service in ai-service/uploads/.
// We proxy /uploads/* to the Python service so the frontend (which talks to
// Node.js on port 5000) can access inspection images seamlessly.
const PYTHON_SERVICE_URL_FOR_UPLOADS = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
app.use('/uploads', async (req, res) => {
  try {
    const targetUrl = `${PYTHON_SERVICE_URL_FOR_UPLOADS}/uploads${req.path}`;
    const response = await axios.get(targetUrl, { responseType: 'stream', timeout: 10000 });
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    response.data.pipe(res);
  } catch {
    res.status(404).json({ error: 'Image not found.' });
  }
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Legal Metrology Backend', port: PORT });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.message);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.',
  });
});

// ── MongoDB connection + server start ────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/legal_metrology';

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✓ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`✓ Backend running at http://localhost:${PORT}`);
      console.log(`  Python AI service: ${process.env.PYTHON_SERVICE_URL || 'http://localhost:8000'}`);
    });
  })
  .catch((err) => {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  });

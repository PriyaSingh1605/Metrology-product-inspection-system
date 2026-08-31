/**
 * admin.routes.js
 * ────────────────
 * All /api/admin/* routes — protected by JWT + admin role.
 */
const express = require('express');
const router = express.Router();
const admin = require('../controllers/admin.controller');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// Apply auth + admin guard to all routes in this router
router.use(protect, requireAdmin);

// Dashboard overview
router.get('/dashboard', admin.getDashboard);

// Officer analytics
router.get('/officers', admin.getOfficers);
router.get('/officers/:id', admin.getOfficerById);

// All scans (paginated, searchable)
router.get('/scans', admin.getScans);

// Final approval queue
router.get('/approvals', admin.getApprovals);
router.get('/approvals/:id', admin.getApprovalById);
router.patch('/approvals/:id/approve', admin.approveInspection);
router.patch('/approvals/:id/reject', admin.rejectInspection);

module.exports = router;

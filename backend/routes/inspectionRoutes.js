const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspectionController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// Create inspection (multi-image, full compliance analysis)
router.post('/', protect, upload.array('image', 5), handleMulterError, inspectionController.createInspection);

// List inspections with search/status filter
router.get('/', protect, inspectionController.listInspections);

// Get inspection by ID
router.get('/:id', protect, inspectionController.getInspection);

// Delete inspection
router.delete('/:id', protect, inspectionController.deleteInspection);

// Download PDF compliance report
router.get('/:id/pdf', protect, inspectionController.downloadPdf);

module.exports = router;

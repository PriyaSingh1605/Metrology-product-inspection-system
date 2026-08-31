const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { protect } = require('../middleware/authMiddleware');
const { upload, handleMulterError } = require('../middleware/uploadMiddleware');

// POST /api/image/check
// Quality pre-check — image is NOT saved, just analyzed
router.post('/check', protect, upload.array('image', 5), handleMulterError, imageController.checkImageQuality);
router.post('/quality', protect, upload.array('images', 5), handleMulterError, imageController.checkMultipleImagesQuality);

module.exports = router;

const { analyzeImageQuality, analyzeMultipleImagesQuality } = require('../services/pythonService');

/**
 * POST /api/image/check
 * ──────────────────────
 * Accepts a product-label image, forwards it to the Python ai-service,
 * and returns the quality analysis result.
 * The image is NOT persisted here — this is a quality pre-check only.
 */
exports.checkImageQuality = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const qualityResults = [];
    for (const file of req.files) {
      qualityResults.push(await analyzeImageQuality(file.buffer, file.originalname, file.mimetype));
    }

    res.json(qualityResults.length === 1 ? qualityResults[0] : qualityResults);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/image/quality
 * Batch quality check for 1-5 packaging images.
 */
exports.checkMultipleImagesQuality = async (req, res, next) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: 'At least 1 image file is required.' });
    }
    const result = await analyzeMultipleImagesQuality(req.files.slice(0, 5));
    res.json(result);
  } catch (err) {
    next(err);
  }
};

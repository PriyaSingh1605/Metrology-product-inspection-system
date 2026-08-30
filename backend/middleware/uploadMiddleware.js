const multer = require('multer');
const path = require('path');

const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Memory storage: image bytes stay in RAM (req.file.buffer).
 * No permanent files are written at this middleware stage.
 * Controllers decide whether to persist or just forward to ai-service.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.includes(file.mimetype);
  const extOk = ALLOWED_EXTENSIONS.includes(ext);

  if (mimeOk && extOk) {
    cb(null, true);
  } else {
    cb(
      Object.assign(new Error('Invalid file type. Only JPG, PNG, and WebP images are allowed.'), {
        statusCode: 422,
      }),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

/**
 * Multer error handler middleware.
 * Must be used AFTER the upload middleware in the route.
 */
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE_MB} MB.`,
      });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err && err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  next(err);
};

module.exports = { upload, handleMulterError };

# ─── Image Quality Thresholds ─────────────────────────────────────────────────
# All thresholds are defined here for easy tuning.
# Adjust these values based on your testing environment and camera conditions.

# ── Resolution ─────────────────────────────────────────────────────────────────
# Minimum acceptable image dimensions for OCR readability.
MIN_WIDTH: int = 640   # pixels
MIN_HEIGHT: int = 480  # pixels

# ── Sharpness / Blur ───────────────────────────────────────────────────────────
# Laplacian variance score. Higher = sharper image.
# Values below this threshold indicate the image is too blurry for OCR.
BLUR_THRESHOLD: float = 80.0

# ── Brightness ─────────────────────────────────────────────────────────────────
# Grayscale mean pixel intensity (0–255).
# Too dark: mean < MIN_BRIGHTNESS
# Too bright / overexposed: mean > MAX_BRIGHTNESS
MIN_BRIGHTNESS: float = 40.0
MAX_BRIGHTNESS: float = 220.0

# ── Contrast ───────────────────────────────────────────────────────────────────
# Grayscale standard deviation. Higher = more contrast.
# Values below this threshold indicate a flat, low-contrast image.
MIN_CONTRAST: float = 20.0

# ── File Constraints ──────────────────────────────────────────────────────────
MAX_FILE_SIZE_MB: int = 10
ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}

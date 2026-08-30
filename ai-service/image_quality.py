"""
image_quality.py
─────────────────
OpenCV-based image quality analysis for the Legal Metrology Compliance System.
Evaluates resolution, sharpness/blur, brightness, and contrast across 1 to 5 packaging images.
"""

from __future__ import annotations
import logging
from pathlib import Path
from typing import Any, List, Dict
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Quality thresholds
MIN_WIDTH = 400
MIN_HEIGHT = 400
BLUR_THRESHOLD = 50.0  # Laplacian variance (below this = blurry)
MIN_BRIGHTNESS = 40.0   # Grayscale mean (0-255)
MAX_BRIGHTNESS = 235.0
MIN_CONTRAST = 25.0     # Standard deviation (below this = washed out/low contrast)
MAX_FILE_SIZE_MB = 16
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
MAX_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def check_validity(content: bytes, filename: str) -> Dict[str, Any]:
    """Basic sanity check: file extension, size, and OpenCV decodability."""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return {
            "status": "fail",
            "reason": f"Unsupported file type '{ext}'. Allowed: JPG, JPEG, PNG, WebP, BMP.",
        }

    if len(content) > MAX_BYTES:
        size_mb = len(content) / (1024 * 1024)
        return {
            "status": "fail",
            "reason": f"File size {size_mb:.1f} MB exceeds {MAX_FILE_SIZE_MB} MB limit.",
        }

    if not content or len(content) == 0:
        return {
            "status": "fail",
            "reason": "Uploaded file is empty (0 bytes).",
        }

    try:
        arr = np.frombuffer(content, dtype=np.uint8)
        if arr.size == 0:
            return {"status": "fail", "reason": "Invalid or empty image byte buffer."}
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        return {"status": "fail", "reason": f"Image decoding error: {e}"}

    if img is None or img.size == 0:
        return {"status": "fail", "reason": "Could not decode file as image. File may be corrupted."}

    return {"status": "pass", "image": img}


def check_resolution(img: np.ndarray) -> Dict[str, Any]:
    """Check image dimensions against minimum requirements for accurate OCR."""
    h, w = img.shape[:2]
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        return {
            "status": "fail",
            "width": w,
            "height": h,
            "reason": f"Resolution {w}x{h} px is too low (minimum {MIN_WIDTH}x{MIN_HEIGHT} px).",
        }
    return {"status": "pass", "width": w, "height": h}


def check_sharpness(img: np.ndarray) -> Dict[str, Any]:
    """Estimate image sharpness using Laplacian variance."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    score = float(laplacian.var())

    if score < BLUR_THRESHOLD:
        return {
            "status": "fail",
            "score": round(score, 2),
            "threshold": BLUR_THRESHOLD,
            "reason": f"Image appears blurry (sharpness: {score:.1f}, min: {BLUR_THRESHOLD}). Hold steady and retake.",
        }
    return {"status": "pass", "score": round(score, 2), "threshold": BLUR_THRESHOLD}


def check_brightness(img: np.ndarray) -> Dict[str, Any]:
    """Evaluate brightness using grayscale mean pixel intensity."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    score = float(gray.mean())

    if score < MIN_BRIGHTNESS:
        return {
            "status": "fail",
            "score": round(score, 2),
            "reason": f"Image is too dark (brightness: {score:.1f}, min: {MIN_BRIGHTNESS}). Ensure good lighting.",
        }
    if score > MAX_BRIGHTNESS:
        return {
            "status": "fail",
            "score": round(score, 2),
            "reason": f"Image is overexposed (brightness: {score:.1f}, max: {MAX_BRIGHTNESS}). Reduce direct glare.",
        }
    return {"status": "pass", "score": round(score, 2)}


def check_contrast(img: np.ndarray) -> Dict[str, Any]:
    """Evaluate contrast using grayscale standard deviation."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    score = float(gray.std())

    if score < MIN_CONTRAST:
        return {
            "status": "fail",
            "score": round(score, 2),
            "threshold": MIN_CONTRAST,
            "reason": f"Low contrast (score: {score:.1f}, min: {MIN_CONTRAST}). Text may blend into background.",
        }
    return {"status": "pass", "score": round(score, 2), "threshold": MIN_CONTRAST}


def _compute_quality_score(checks: Dict[str, dict]) -> int:
    """Compute overall image quality score out of 100."""
    weights = {"resolution": 20, "sharpness": 35, "brightness": 25, "contrast": 20}
    score = 0
    for key, weight in weights.items():
        if checks.get(key, {}).get("status") == "pass":
            score += weight
    return score


def analyze_image_quality(content: bytes, filename: str) -> Dict[str, Any]:
    """Run all quality checks on an individual image."""
    validity = check_validity(content, filename)
    if validity["status"] == "fail":
        return {
            "filename": filename,
            "status": "needs_retake",
            "quality_score": 0,
            "checks": {
                "validity": {"status": "fail", "reason": validity["reason"]},
                "resolution": {"status": "skipped"},
                "sharpness": {"status": "skipped"},
                "brightness": {"status": "skipped"},
                "contrast": {"status": "skipped"},
            },
            "message": validity["reason"],
            "failed_reasons": [validity["reason"]],
        }

    img = validity["image"]
    resolution_res = check_resolution(img)
    sharpness_res = check_sharpness(img)
    brightness_res = check_brightness(img)
    contrast_res = check_contrast(img)

    checks = {
        "resolution": resolution_res,
        "sharpness": sharpness_res,
        "brightness": brightness_res,
        "contrast": contrast_res,
    }

    failed = [k for k, v in checks.items() if v["status"] == "fail"]
    failed_reasons = [checks[k].get("reason", f"{k} check failed") for k in failed]
    quality_score = _compute_quality_score(checks)

    if not failed:
        return {
            "filename": filename,
            "status": "ready_for_ocr",
            "quality_score": quality_score,
            "checks": checks,
            "message": "Image quality is optimal for OCR compliance scanning.",
            "failed_reasons": [],
        }

    if len(failed) == 1:
        message = failed_reasons[0]
    else:
        labels = {"resolution": "Resolution", "sharpness": "Sharpness", "brightness": "Brightness", "contrast": "Contrast"}
        failed_labels = ", ".join(labels.get(f, f) for f in failed)
        message = f"Quality issues detected in {failed_labels}. Retake recommended."

    return {
        "filename": filename,
        "status": "needs_retake",
        "quality_score": quality_score,
        "checks": checks,
        "message": message,
        "failed_reasons": failed_reasons,
    }


# Backward-compatible public API used by the existing pytest suite and older callers.
def analyze_image(content: bytes, filename: str) -> Dict[str, Any]:
    """Alias for :func:`analyze_image_quality` kept for backward compatibility."""
    return analyze_image_quality(content, filename)


def analyze_multiple_images_quality(images_data: List[tuple[bytes, str]]) -> Dict[str, Any]:
    """
    Run quality checks across a list of (image_bytes, filename) pairs.
    Returns individual results per image and combined status.
    """
    individual_results = []
    for content, filename in images_data:
        res = analyze_image_quality(content, filename)
        individual_results.append(res)

    all_ready = all(r["status"] == "ready_for_ocr" for r in individual_results)
    avg_score = int(np.mean([r["quality_score"] for r in individual_results])) if individual_results else 0

    all_failed_reasons = []
    for idx, r in enumerate(individual_results, 1):
        for reason in r["failed_reasons"]:
            all_failed_reasons.append(f"Image #{idx} ({r['filename']}): {reason}")

    return {
        "status": "ready_for_ocr" if all_ready else "needs_retake",
        "overall_quality_score": avg_score,
        "image_count": len(individual_results),
        "results": individual_results,
        "failed_reasons": all_failed_reasons,
        "message": "All images passed quality checks." if all_ready else f"Quality warnings detected across {len(all_failed_reasons)} checks.",
    }

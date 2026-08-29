"""
test_image_quality.py
──────────────────────
Pytest test suite for the image_quality module.

Test images can be placed in ai-service/tests/images/.
Each test creates synthetic images using NumPy/OpenCV to avoid
requiring external image files.

To run:
  cd ai-service
  pytest tests/test_image_quality.py -v
"""

import sys
import os

# Allow importing from parent directory (ai-service/)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import cv2
import numpy as np
import pytest
from image_quality import (
    analyze_image,
    check_resolution,
    check_sharpness,
    check_brightness,
    check_contrast,
    check_validity,
)
from config import MIN_WIDTH, MIN_HEIGHT


# ── Helpers ────────────────────────────────────────────────────────────────────

def _encode_image(img: np.ndarray, ext: str = ".jpg") -> bytes:
    """Encode a numpy image array to bytes."""
    success, buf = cv2.imencode(ext, img)
    assert success, "cv2.imencode failed"
    return buf.tobytes()


def _make_sharp_image(w: int = 800, h: int = 600) -> np.ndarray:
    """Create a synthetic sharp image with clear edges and balanced brightness."""
    # White/light gray background (240)
    img = np.full((h, w, 3), 240, dtype=np.uint8)
    # Draw high-contrast dark grid lines and barcodes for sharpness
    for i in range(0, w, 20):
        cv2.line(img, (i, 0), (i, h), (30, 30, 30), 2)
    for j in range(0, h, 20):
        cv2.line(img, (0, j), (w, j), (30, 30, 30), 2)
    # Add text-like content in black
    cv2.putText(img, "PRODUCT LABEL", (50, 100), cv2.FONT_HERSHEY_SIMPLEX,
                2, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(img, "NET WT: 500g", (50, 200), cv2.FONT_HERSHEY_SIMPLEX,
                1.5, (0, 0, 0), 2, cv2.LINE_AA)
    return img


def _make_blurry_image(w: int = 800, h: int = 600) -> np.ndarray:
    """Create a heavily blurred image."""
    img = _make_sharp_image(w, h)
    # Apply heavy Gaussian blur to reduce Laplacian variance
    return cv2.GaussianBlur(img, (51, 51), 30)


def _make_dark_image(w: int = 800, h: int = 600) -> np.ndarray:
    """Create an underexposed (very dark) image."""
    img = np.full((h, w, 3), 15, dtype=np.uint8)  # near-black
    return img


def _make_overexposed_image(w: int = 800, h: int = 600) -> np.ndarray:
    """Create an overexposed (very bright) image."""
    img = np.full((h, w, 3), 245, dtype=np.uint8)  # near-white
    return img


def _make_low_resolution_image(w: int = 100, h: int = 80) -> np.ndarray:
    """Create an image below the minimum resolution threshold."""
    img = _make_sharp_image(w, h)
    return img


def _make_low_contrast_image(w: int = 800, h: int = 600) -> np.ndarray:
    """Create an image with very low contrast (nearly uniform gray)."""
    # All pixels at 128 with tiny variation → std dev ≈ 0
    img = np.full((h, w, 3), 128, dtype=np.uint8)
    return img


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestGoodImage:
    """Test 1: A sharp, well-lit, sufficiently sized image should pass all checks."""

    def test_ready_for_ocr(self):
        img = _make_sharp_image()
        content = _encode_image(img)
        result = analyze_image(content, "good_label.jpg")
        assert result["status"] == "ready_for_ocr", (
            f"Expected ready_for_ocr but got: {result['status']}. "
            f"Message: {result['message']}"
        )
        assert result["quality_score"] > 50

    def test_all_checks_pass(self):
        img = _make_sharp_image()
        content = _encode_image(img)
        result = analyze_image(content, "good_label.jpg")
        for check_name in ["resolution", "sharpness", "brightness", "contrast"]:
            assert result["checks"][check_name]["status"] == "pass", (
                f"Check '{check_name}' failed unexpectedly: "
                f"{result['checks'][check_name]}"
            )


class TestBlurryImage:
    """Test 2: A blurry image should fail the sharpness check."""

    def test_needs_retake(self):
        img = _make_blurry_image()
        content = _encode_image(img)
        result = analyze_image(content, "blurry.jpg")
        assert result["status"] == "needs_retake"

    def test_sharpness_fails(self):
        img = _make_blurry_image()
        content = _encode_image(img)
        result = analyze_image(content, "blurry.jpg")
        assert result["checks"]["sharpness"]["status"] == "fail"
        assert "blurry" in result["message"].lower() or "sharpness" in result["message"].lower()


class TestDarkImage:
    """Test 3: A very dark image should fail the brightness check."""

    def test_needs_retake(self):
        img = _make_dark_image()
        content = _encode_image(img)
        result = analyze_image(content, "dark.jpg")
        assert result["status"] == "needs_retake"

    def test_brightness_fails(self):
        img = _make_dark_image()
        content = _encode_image(img)
        result = analyze_image(content, "dark.jpg")
        assert result["checks"]["brightness"]["status"] == "fail"
        assert "dark" in result["checks"]["brightness"]["reason"].lower()


class TestOverexposedImage:
    """Test 4: An overexposed (very bright) image should fail brightness check."""

    def test_needs_retake(self):
        img = _make_overexposed_image()
        content = _encode_image(img)
        result = analyze_image(content, "overexposed.jpg")
        assert result["status"] == "needs_retake"

    def test_brightness_overexposed(self):
        img = _make_overexposed_image()
        content = _encode_image(img)
        result = analyze_image(content, "overexposed.jpg")
        assert result["checks"]["brightness"]["status"] == "fail"
        assert "overexposed" in result["checks"]["brightness"]["reason"].lower()


class TestLowResolutionImage:
    """Test 5: A very small image should fail the resolution check."""

    def test_needs_retake(self):
        img = _make_low_resolution_image()
        content = _encode_image(img)
        result = analyze_image(content, "lowres.jpg")
        assert result["status"] == "needs_retake"

    def test_resolution_fails(self):
        img = _make_low_resolution_image()
        content = _encode_image(img)
        result = analyze_image(content, "lowres.jpg")
        assert result["checks"]["resolution"]["status"] == "fail"
        assert result["checks"]["resolution"]["width"] < MIN_WIDTH


class TestLowContrastImage:
    """Test 6: A nearly-uniform gray image should fail the contrast check."""

    def test_needs_retake(self):
        img = _make_low_contrast_image()
        content = _encode_image(img)
        result = analyze_image(content, "lowcontrast.jpg")
        assert result["status"] == "needs_retake"

    def test_contrast_fails(self):
        img = _make_low_contrast_image()
        content = _encode_image(img)
        result = analyze_image(content, "lowcontrast.jpg")
        assert result["checks"]["contrast"]["status"] == "fail"


class TestInvalidCorruptImage:
    """Test 7: An invalid/corrupt file should fail the validity check."""

    def test_corrupt_bytes_rejected(self):
        corrupt_content = b"this is not an image file at all \x00\xFF\xFE"
        result = analyze_image(corrupt_content, "corrupt.jpg")
        assert result["status"] == "needs_retake"

    def test_empty_bytes_rejected(self):
        result = analyze_image(b"", "empty.jpg")
        assert result["status"] == "needs_retake"

    def test_wrong_extension_rejected(self):
        img = _make_sharp_image()
        content = _encode_image(img)
        result = analyze_image(content, "label.gif")  # GIF not supported
        assert result["status"] == "needs_retake"
        assert "checks" in result


class TestIndividualChecks:
    """Unit tests for individual check functions."""

    def test_check_resolution_pass(self):
        img = np.zeros((600, 800, 3), dtype=np.uint8)
        result = check_resolution(img)
        assert result["status"] == "pass"
        assert result["width"] == 800
        assert result["height"] == 600

    def test_check_resolution_fail(self):
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        result = check_resolution(img)
        assert result["status"] == "fail"

    def test_check_sharpness_returns_score(self):
        img = _make_sharp_image()
        result = check_sharpness(img)
        assert "score" in result
        assert isinstance(result["score"], float)

    def test_check_brightness_mid_range(self):
        img = np.full((100, 100, 3), 128, dtype=np.uint8)
        result = check_brightness(img)
        assert result["status"] == "pass"

    def test_check_contrast_score_type(self):
        img = _make_sharp_image()
        result = check_contrast(img)
        assert "score" in result
        assert isinstance(result["score"], float)

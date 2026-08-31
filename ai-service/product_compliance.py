import os
# PaddlePaddle 3.x CPU + oneDNN can raise:
# ConvertPirAttribute2RuntimeAttribute not support pir::ArrayAttribute<DoubleAttribute>
# on Windows. Disable oneDNN before importing PaddleOCR so inference uses the
# regular CPU engine.
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ.setdefault("FLAGS_use_mkldnn", "0")
import re
import json
from pathlib import Path
import logging
from difflib import SequenceMatcher
from typing import List, Dict, Any, Optional, Tuple

import numpy as np
from paddleocr import PaddleOCR
from groq import Groq
from dotenv import load_dotenv

from image_quality import analyze_image_quality

logger = logging.getLogger(__name__)

# ============================================================
# CONFIG
# ============================================================

load_dotenv(Path(__file__).resolve().parent / ".env")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env")

groq_client = Groq(api_key=GROQ_API_KEY)

# Initialize PaddleOCR exactly once when the AI service process starts.
# The same in-memory OCR instance is reused for every inspection request.
# Do not construct PaddleOCR inside request handlers.
ocr = PaddleOCR(
    lang="en",
    device="cpu",
    enable_mkldnn=False,
    enable_hpi=False,
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)
logger.info("PaddleOCR initialized once and ready for requests.")


# ============================================================
# DATA STRUCTURES
# ============================================================

def empty_product_data() -> Dict[str, Any]:
    return {
        "product_name": None,
        "manufacturer_name": None,
        "manufacturer_address": None,
        "packer_name": None,
        "packer_address": None,
        "importer_name": None,
        "importer_address": None,
        "country_of_origin": None,
        "net_quantity": None,
        "net_quantity_unit": None,
        "mrp": None,
        "mrp_currency": None,
        "unit_sale_price": None,
        "manufacture_month": None,
        "manufacture_year": None,
        "best_before": None,
        "use_by_date": None,
        "consumer_care_phone": None,
        "consumer_care_email": None,
        "consumer_care_address": None,
    }


def empty_rule_data() -> Dict[str, bool]:
    return {
        "has_product_name": False,
        "has_manufacturer": False,
        "has_packer": False,
        "has_importer": False,
        "has_country_of_origin": False,
        "has_net_quantity": False,
        "has_mrp": False,
        "has_unit_sale_price": False,
        "has_manufacture_date": False,
        "has_best_before": False,
        "has_use_by": False,
        "has_consumer_care": False,
        "mrp_format_valid": False,
        "quantity_format_valid": False,
        "date_format_valid": False,
        "consumer_care_format_valid": False,
        "font_size_valid": True,
    }


def empty_visual_data() -> Dict[str, Any]:
    return {
        "ocr_confidence": 0.0,
        "mrp_confidence": 0.0,
        "quantity_confidence": 0.0,
        "manufacturer_confidence": 0.0,
        "date_confidence": 0.0,
        "consumer_care_confidence": 0.0,
        "mrp_bbox": None,
        "mrp_image_index": 0,
        "quantity_bbox": None,
        "quantity_image_index": 0,
        "manufacturer_bbox": None,
        "manufacturer_image_index": 0,
        "consumer_care_bbox": None,
        "consumer_care_image_index": 0,
        "per_image_boxes": [],
    }


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def clean_text(text) -> str:
    if text is None:
        return ""
    text = str(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def has_value(value) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def normalize_for_matching(text) -> str:
    text = clean_text(text).lower()
    text = re.sub(r"[^a-z0-9]+", "", text)
    return text


# ============================================================
# OCR EXTRACTION (SINGLE & MULTI-IMAGE)
# ============================================================

def _coerce_json(value):
    """Convert PaddleOCR result wrappers/JSON into a normal Python object."""
    if value is None:
        return None
    if hasattr(value, "json"):
        try:
            value = value.json
            if callable(value):
                value = value()
        except Exception:
            pass
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return None
    if isinstance(value, dict):
        return value
    return value


def _append_ocr_records(data, texts, confidences, boxes, lines_meta, image_index):
    """Read OCRResult/dict/list formats used by PaddleOCR 2.x and 3.x."""
    data = _coerce_json(data)
    if data is None:
        return

    # PaddleOCR 3.x often exposes the actual result under `res`.
    if isinstance(data, dict):
        if isinstance(data.get("res"), dict):
            _append_ocr_records(data["res"], texts, confidences, boxes, lines_meta, image_index)
            return

        rec_texts = data.get("rec_texts")
        rec_scores = data.get("rec_scores")
        rec_boxes = data.get("rec_boxes")
        if rec_boxes is None:
            rec_boxes = data.get("rec_polys")

        if rec_texts is not None:
            try:
                text_items = list(rec_texts)
            except Exception:
                text_items = []
            try:
                score_items = list(rec_scores) if rec_scores is not None else []
            except Exception:
                score_items = []
            try:
                box_items = list(rec_boxes) if rec_boxes is not None else []
            except Exception:
                box_items = []

            for i, raw_text in enumerate(text_items):
                text = clean_text(raw_text)
                if not text:
                    continue
                try:
                    score = float(score_items[i]) if i < len(score_items) else 0.0
                except (TypeError, ValueError):
                    score = 0.0
                try:
                    box = np.asarray(box_items[i]).tolist() if i < len(box_items) else None
                except Exception:
                    box = None
                texts.append(text)
                confidences.append(score)
                boxes.append(box)
                lines_meta.append({
                    "text": text,
                    "confidence": score,
                    "box": box,
                    "image_index": image_index,
                })
            return

        # Some Paddle versions use nested result dictionaries.
        for key in ("ocr", "result", "results", "data"):
            if key in data:
                _append_ocr_records(data[key], texts, confidences, boxes, lines_meta, image_index)
        return

    if isinstance(data, (list, tuple)):
        # Classic PaddleOCR format: [[box, [text, confidence]], ...]
        for item in data:
            if not item:
                continue
            if isinstance(item, (list, tuple)) and len(item) >= 2:
                box_raw, text_conf = item[0], item[1]
                if isinstance(text_conf, (list, tuple)) and len(text_conf) >= 2:
                    text = clean_text(text_conf[0])
                    try:
                        score = float(text_conf[1])
                    except (TypeError, ValueError):
                        score = 0.0
                    if text:
                        try:
                            box = np.asarray(box_raw).tolist()
                        except Exception:
                            box = None
                        texts.append(text)
                        confidences.append(score)
                        boxes.append(box)
                        lines_meta.append({
                            "text": text,
                            "confidence": score,
                            "box": box,
                            "image_index": image_index,
                        })
                        continue
            # Otherwise this is probably a nested PaddleOCR result.
            _append_ocr_records(item, texts, confidences, boxes, lines_meta, image_index)


def _run_paddleocr(image_path: str):
    """Run OCR with PaddleOCR v3 first and legacy API as a compatibility fallback."""
    errors = []
    if hasattr(ocr, "predict"):
        try:
            return ocr.predict(image_path), errors
        except Exception as exc:
            errors.append(f"predict: {type(exc).__name__}: {exc}")

    if hasattr(ocr, "ocr"):
        for kwargs in ({}, {"cls": False}):
            try:
                return ocr.ocr(image_path, **kwargs), errors
            except Exception as exc:
                errors.append(f"ocr({kwargs}): {type(exc).__name__}: {exc}")

    try:
        return ocr(image_path), errors
    except Exception as exc:
        errors.append(f"callable: {type(exc).__name__}: {exc}")
        return None, errors


def extract_ocr_from_single_image(image_path: str, image_index: int = 0) -> Dict[str, Any]:
    """Extract OCR lines and bounding boxes from a single image.

    Supports PaddleOCR 2.x legacy output and PaddleOCR 3.x OCRResult objects.
    """
    texts, confidences, boxes, lines_meta = [], [], [], []
    result, errors = _run_paddleocr(image_path)

    if result is not None:
        _append_ocr_records(result, texts, confidences, boxes, lines_meta, image_index)

    # OCR can occasionally miss small/low-contrast label text. One lightweight
    # pre-processing retry makes the pipeline more robust without changing the
    # original image or the bounding boxes returned by the successful pass.
    if not texts:
        try:
            import cv2
            img = cv2.imread(image_path)
            if img is not None:
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                gray = cv2.resize(gray, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
                enhanced = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
                tmp_path = str(Path(image_path).with_name(Path(image_path).stem + "_ocr_enhanced.jpg"))
                cv2.imwrite(tmp_path, enhanced, [cv2.IMWRITE_JPEG_QUALITY, 95])
                retry_result, retry_errors = _run_paddleocr(tmp_path)
                _append_ocr_records(retry_result, texts, confidences, boxes, lines_meta, image_index)
                errors.extend([f"enhanced {e}" for e in retry_errors])
                try:
                    Path(tmp_path).unlink(missing_ok=True)
                except Exception:
                    pass
        except Exception as exc:
            errors.append(f"preprocess: {type(exc).__name__}: {exc}")

    if errors and not texts:
        logger.error("PaddleOCR produced no text for %s: %s", image_path, " | ".join(errors))

    return {
        "texts": texts,
        "confidences": confidences,
        "boxes": boxes,
        "lines_meta": lines_meta,
        "errors": errors,
    }

def extract_multi_image_ocr(image_paths: List[str]) -> Dict[str, Any]:
    """
    Run OCR on 1 to 5 images, returning unified text lines with image indexing.
    """
    all_texts = []
    all_confidences = []
    all_boxes = []
    all_lines_meta = []
    per_image_results = []
    panel_text_blocks = []

    for idx, path in enumerate(image_paths):
        panel_label = f"Panel {idx + 1}"
        ocr_res = extract_ocr_from_single_image(path, image_index=idx)
        per_image_results.append({
            "image_index": idx,
            "path": path,
            "texts": ocr_res["texts"],
            "confidences": ocr_res["confidences"],
            "boxes": ocr_res["boxes"],
            "line_count": len(ocr_res["texts"]),
            "ocr_errors": ocr_res.get("errors", []),
        })

        if ocr_res["texts"]:
            panel_text_blocks.append(f"--- [PACKAGING {panel_label.upper()}] ---\n" + "\n".join(ocr_res["texts"]))

        all_texts.extend(ocr_res["texts"])
        all_confidences.extend(ocr_res["confidences"])
        all_boxes.extend(ocr_res["boxes"])
        all_lines_meta.extend(ocr_res["lines_meta"])

    combined_ocr_text = "\n\n".join(panel_text_blocks) if panel_text_blocks else "\n".join(all_texts)

    return {
        "texts": all_texts,
        "confidences": all_confidences,
        "boxes": all_boxes,
        "lines_meta": all_lines_meta,
        "combined_text": combined_ocr_text,
        "per_image": per_image_results,
    }


def calculate_ocr_confidence(confidences: List[float]) -> float:
    if not confidences:
        return 0.0
    valid_scores = [float(s) for s in confidences if isinstance(s, (int, float)) and 0 <= s <= 1]
    if not valid_scores:
        return 0.0
    return round(float(np.mean(valid_scores)), 4)


# ============================================================
# GROQ LLM STRUCTURED INFORMATION EXTRACTION
# ============================================================

def _heuristic_extract_product_information(ocr_text: str, product_hint: Optional[str] = None) -> Dict[str, Any]:
    """Deterministic extraction fallback for common package-label patterns.

    OCR is noisy, so this intentionally supplements (rather than replaces) Groq.
    It only returns values supported by recognizable text patterns.
    """
    data = empty_product_data()
    text = clean_text(ocr_text)
    lines = [clean_text(x) for x in ocr_text.splitlines() if clean_text(x)]
    joined = "\n".join(lines)

    # Product identity: prefer explicit label wording; otherwise use a likely
    # short title line containing a known product-type word.
    for line in lines:
        low = line.lower()
        if re.search(r'\b(product|product name|name)\s*[:\-]', low):
            val = re.sub(r'^.*?\b(?:product(?:\s+name)?|name)\s*[:\-]\s*', '', line, flags=re.I)
            if len(val) >= 3:
                data['product_name'] = val.strip()
                break

    # If the officer supplied a product name, use it only as a search key. The
    # value is accepted as package evidence only when its meaningful words are
    # also found in OCR text.
    if not data['product_name'] and product_hint:
        hint_words=[w for w in re.findall(r'[A-Za-z0-9]+', product_hint.lower()) if len(w) >= 3]
        normalized_lines=[re.sub(r'[^a-z0-9]+','', x.lower()) for x in lines]
        matches=[w for w in hint_words if any(w in nl for nl in normalized_lines)]
        if hint_words and len(matches) >= max(1, min(2, len(hint_words))):
            data['product_name']=clean_text(product_hint)

    # MRP: require an MRP-like label to avoid turning arbitrary numbers into price.
    mrp_patterns = [
        r'\bmrp\s*(?:incl\.?\s*(?:of\s*)?all\s*taxes)?\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)',
        r'\bmaximum\s*retail\s*price\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)',
    ]
    for pat in mrp_patterns:
        m=re.search(pat, text, re.I)
        if m:
            data['mrp']=m.group(1)
            # Preserve explicit currency if present nearby.
            snippet=m.group(0).lower()
            data['mrp_currency']='₹' if '₹' in m.group(0) else ('Rs.' if 'rs' in snippet else ('INR' if 'inr' in snippet else None))
            break

    # Net quantity / volume / weight.
    qty_patterns = [
        r'\b(?:net\s*(?:qty|quantity|wt|weight|vol|volume|content)|net\s*contents?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(mg|kg|g|ml|l|litre|litres|liter|liters|pcs|pieces|count)\b',
        r'\b([0-9]+(?:\.[0-9]+)?)\s*(mg|kg|g|ml|l|litre|litres|liter|liters|pcs|pieces)\b',
    ]
    for pat in qty_patterns:
        m=re.search(pat, text, re.I)
        if m:
            # For generic-number pattern, favor it only when close to net/qty/vol wording.
            if pat == qty_patterns[1] and not re.search(r'\b(?:net|qty|quantity|weight|wt|volume|vol|content)\b', text[max(0,m.start()-40):m.start()], re.I):
                continue
            data['net_quantity']=m.group(1)
            unit=m.group(2).lower()
            unit_map={'litres':'l','liters':'l','litre':'l','liter':'l','pieces':'pcs'}
            data['net_quantity_unit']=unit_map.get(unit,unit)
            break

    # Manufacturing / packing date. Accept MM/YYYY, MM-YYYY, MM.YYYY and month names.
    date_context = re.search(r'(?i)\b(?:mfg|mfd|m\.?fg|manufactur(?:ed|e)|pkd|packed|packing|date)\b[^\n]{0,45}', joined)
    contexts = [date_context.group(0)] if date_context else []
    contexts.append(text)
    date_patterns = [
        r'\b(0?[1-9]|1[0-2])\s*[/\-.]\s*(20\d{2})\b',
        r'\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*[,\-/]?\s*(20\d{2})\b',
    ]
    for ctx in contexts:
        for pat in date_patterns:
            m=re.search(pat, ctx, re.I)
            if m:
                data['manufacture_month']=m.group(1)
                data['manufacture_year']=m.group(2)
                break
        if data['manufacture_year']:
            break

    # Consumer care details.
    email=re.search(r'\b[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}\b', text, re.I)
    if email: data['consumer_care_email']=email.group(0)
    phone_candidates=re.findall(r'(?<!\d)(?:\+?91[\s\-]?)?(?:[6-9]\d{9}|1800\s*\d{3}\s*\d{4})(?!\d)', text)
    if phone_candidates: data['consumer_care_phone']=phone_candidates[0]

    # Explicit country of origin.
    m=re.search(r'\b(?:country\s+of\s+origin|made\s+in)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,30})', text, re.I)
    if m: data['country_of_origin']=m.group(1).strip()

    # Manufacturer / packer / importer. Capture the labelled line and, when
    # address follows on adjacent lines, keep it as the address.
    role_patterns = [
        (r'(?:manufacturer|manufactured\s+by|mfg\.?\s+by)', 'manufacturer_name', 'manufacturer_address'),
        (r'(?:packer|packed\s+by)', 'packer_name', 'packer_address'),
        (r'(?:importer|imported\s+by)', 'importer_name', 'importer_address'),
    ]
    for role_pattern, name_key, addr_key in role_patterns:
        if data[name_key]:
            continue
        for i, line in enumerate(lines):
            m = re.search(r'\b' + role_pattern + r'\s*[:\-]?\s*(.+)', line, re.I)
            if not m:
                continue
            val = m.group(1).strip(' :-')
            if len(val) < 3:
                continue
            data[name_key] = val
            # Address is frequently wrapped onto the next OCR line.
            address_parts = []
            for nxt in lines[i + 1:i + 3]:
                if re.search(r'\b(plot|road|rd\.?|street|st\.?|sector|industrial|village|distt?|district|pin|pincode|no\.?\s*\d)', nxt, re.I):
                    address_parts.append(nxt)
                elif address_parts:
                    break
            if address_parts:
                data[addr_key] = ' '.join(address_parts)
            break

    return data


def _merge_extracted(primary: Dict[str, Any], fallback: Dict[str, Any]) -> Dict[str, Any]:
    """Fill only missing Groq fields from deterministic OCR heuristics."""
    result=empty_product_data()
    for key in result:
        value=primary.get(key) if isinstance(primary,dict) else None
        if not has_value(value):
            value=fallback.get(key) if isinstance(fallback,dict) else None
        result[key]=value
    return result


def extract_product_information(ocr_text: str, product_hint: Optional[str] = None, manufacturer_hint: Optional[str] = None) -> Dict[str, Any]:
    print("\n[Groq] Extracting structured package declarations...")
    fallback=_heuristic_extract_product_information(ocr_text, product_hint=product_hint)

    # User-entered metadata is context for the LLM only. It must never be
    # counted as package-label evidence for a compliance declaration.

    prompt = f"""
You are an expert Legal Metrology (Packaged Commodities) Rules, 2011 compliance analyzer for Indian packaged goods.
Extract declarations from OCR text collected from 1 to 5 package panels.

CRITICAL:
- OCR may contain spelling mistakes, broken words, duplicated lines and missing punctuation.
- Use the surrounding text and labels such as MRP, Net Qty, Mfg, Mfd, Pkd, Manufactured by, Packed by, Customer Care.
- A value can span adjacent OCR lines; combine adjacent lines when they clearly belong to one declaration.
- Do NOT require the exact label spelling to be perfect.
- NEVER invent a value that is not supported by the OCR.
- Return null when evidence is absent.
- Return ONLY JSON matching this schema.

FIELDS:
product_name, manufacturer_name, manufacturer_address, packer_name, packer_address,
importer_name, importer_address, country_of_origin, net_quantity, net_quantity_unit,
mrp, mrp_currency, unit_sale_price, manufacture_month, manufacture_year,
best_before, use_by_date, consumer_care_phone, consumer_care_email, consumer_care_address.

USER-ENTERED PRODUCT NAME (context only): {clean_text(product_hint) if product_hint else 'none'}

OCR TEXT:
----------------
{ocr_text}
----------------
"""

    parsed={}
    try:
        response=groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role":"system","content":"Extract package declarations as strict JSON. Never hallucinate."},
                {"role":"user","content":prompt},
            ],
            temperature=0.0,
            response_format={"type":"json_object"},
        )
        parsed=json.loads(response.choices[0].message.content or "{}")
    except Exception as e:
        print(f"[Groq Error] {e}; using deterministic OCR extraction fallback.")
        try:
            response=groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role":"user","content":prompt}],
                temperature=0.0,
                response_format={"type":"json_object"},
            )
            parsed=json.loads(response.choices[0].message.content or "{}")
        except Exception as e2:
            print(f"[Groq Fallback Error] {e2}")

    return _merge_extracted(parsed, fallback)


# ============================================================
# MULTI-IMAGE BOUNDING BOX & CONFIDENCE MATCHING
# ============================================================

def find_matching_ocr_line_multi(value, lines_meta: List[Dict[str, Any]]) -> Tuple[Optional[List], float, int]:
    """
    Search across all multi-image OCR lines to find matching bounding box, confidence, and image index.
    """
    if not has_value(value):
        return None, 0.0, 0

    target = normalize_for_matching(value)
    if not target:
        return None, 0.0, 0

    best_score = 0.0
    best_meta = None

    for meta in lines_meta:
        current = normalize_for_matching(meta["text"])
        if not current:
            continue

        if target in current or current in target:
            score = 1.0
        else:
            score = SequenceMatcher(None, target, current).ratio()

        if score > best_score:
            best_score = score
            best_meta = meta

    if best_meta is None or best_score < 0.35:
        return None, 0.0, 0

    bbox = best_meta.get("box")
    ocr_conf = float(best_meta.get("confidence", 0.0))
    img_idx = int(best_meta.get("image_index", 0))
    field_conf = round(float(best_score) * ocr_conf, 4)

    return bbox, field_conf, img_idx


def calculate_field_analysis_multi(product: Dict[str, Any], ocr_data: Dict[str, Any]) -> Dict[str, Any]:
    visual = empty_visual_data()
    visual["ocr_confidence"] = calculate_ocr_confidence(ocr_data["confidences"])
    lines_meta = ocr_data.get("lines_meta", [])

    # Group boxes per image index for UI bounding box overlays
    per_image_boxes = []
    for item in ocr_data.get("per_image", []):
        per_image_boxes.append({
            "image_index": item["image_index"],
            "boxes": item["boxes"],
            "texts": item["texts"],
            "confidences": item["confidences"],
        })
    visual["per_image_boxes"] = per_image_boxes

    # MRP
    mrp_box, mrp_conf, mrp_img_idx = find_matching_ocr_line_multi(product.get("mrp"), lines_meta)
    visual["mrp_bbox"] = mrp_box
    visual["mrp_confidence"] = mrp_conf
    visual["mrp_image_index"] = mrp_img_idx

    # Net Quantity
    qty_val = f"{product.get('net_quantity') or ''} {product.get('net_quantity_unit') or ''}".strip()
    qty_box, qty_conf, qty_img_idx = find_matching_ocr_line_multi(qty_val, lines_meta)
    visual["quantity_bbox"] = qty_box
    visual["quantity_confidence"] = qty_conf
    visual["quantity_image_index"] = qty_img_idx

    # Manufacturer
    mfg_val = product.get("manufacturer_name") or product.get("manufacturer_address")
    mfg_box, mfg_conf, mfg_img_idx = find_matching_ocr_line_multi(mfg_val, lines_meta)
    visual["manufacturer_bbox"] = mfg_box
    visual["manufacturer_confidence"] = mfg_conf
    visual["manufacturer_image_index"] = mfg_img_idx

    # Mfg Date
    date_val = f"{product.get('manufacture_month') or ''}/{product.get('manufacture_year') or ''}".strip("/")
    date_box, date_conf, _ = find_matching_ocr_line_multi(date_val, lines_meta)
    visual["date_confidence"] = date_conf

    # Consumer Care
    care_val = product.get("consumer_care_phone") or product.get("consumer_care_email") or product.get("consumer_care_address")
    care_box, care_conf, care_img_idx = find_matching_ocr_line_multi(care_val, lines_meta)
    visual["consumer_care_bbox"] = care_box
    visual["consumer_care_confidence"] = care_conf
    visual["consumer_care_image_index"] = care_img_idx

    return visual


# ============================================================
# FONT SIZE & READABILITY ANALYSIS (RULE 7 & SCHEDULE)
# ============================================================

def analyze_font_size_and_readability(
    product: Dict[str, Any],
    visual: Dict[str, Any],
    ocr_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Evaluates declaration font size against Legal Metrology Schedule requirements.
    Prescribed minimum numeral height for Net Quantity:
      - Weight/Volume <= 50g/ml         -> Min 1.0 mm (approx. ~12-16px on standard resolution)
      - 50g < Net Qty <= 200g/ml        -> Min 2.0 mm (approx. ~20-25px)
      - 200g < Net Qty <= 1000g/ml (1kg)-> Min 4.0 mm (approx. ~35-45px)
      - Net Qty > 1000g/1kg             -> Min 6.0 mm (approx. ~55-65px)
    """
    qty_num = 0.0
    try:
        raw_qty = re.sub(r"[^\d.]", "", str(product.get("net_quantity") or "0"))
        qty_num = float(raw_qty) if raw_qty else 0.0
    except Exception:
        qty_num = 0.0

    unit = str(product.get("net_quantity_unit") or "").lower()
    if "kg" in unit or "l" in unit or "litre" in unit or "liter" in unit:
        qty_num = qty_num * 1000.0  # normalize to grams / ml

    # Legal Metrology minimum required height
    if qty_num <= 50:
        min_required_height_mm = 1.0
        standard_box_px = 14
    elif qty_num <= 200:
        min_required_height_mm = 2.0
        standard_box_px = 22
    elif qty_num <= 1000:
        min_required_height_mm = 4.0
        standard_box_px = 38
    else:
        min_required_height_mm = 6.0
        standard_box_px = 56

    # Estimate height from bounding box
    bbox = visual.get("quantity_bbox")
    estimated_height_px = 0.0
    if bbox and len(bbox) >= 4:
        try:
            # bbox format: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
            y_coords = [p[1] for p in bbox]
            estimated_height_px = max(y_coords) - min(y_coords)
        except Exception:
            estimated_height_px = standard_box_px

    if estimated_height_px <= 0:
        estimated_height_px = standard_box_px * 1.1

    # Approximate conversion factor for standard DPI
    estimated_height_mm = round((estimated_height_px / standard_box_px) * min_required_height_mm, 1)
    if estimated_height_mm < 0.5:
        estimated_height_mm = min_required_height_mm

    font_size_compliant = estimated_height_mm >= (min_required_height_mm * 0.85)

    # Readability score based on OCR confidence and contrast
    readability_score = int(visual.get("ocr_confidence", 0.8) * 100)
    readability_compliant = readability_score >= 50

    return {
        "net_quantity_height_mm": estimated_height_mm,
        "min_required_height_mm": min_required_height_mm,
        "font_size_compliant": font_size_compliant,
        "readability_score": readability_score,
        "readability_compliant": readability_compliant,
        "estimated_pixel_height": round(estimated_height_px, 1),
        "rule_reference": "Rule 7 & Schedule of Legal Metrology (Packaged Commodities) Rules, 2011",
    }


# ============================================================
# RULE VALIDATION ENGINE
# ============================================================

def validate_mrp(mrp) -> bool:
    if not has_value(mrp):
        return False
    value = str(mrp).strip()
    pattern = r"^(₹|Rs\.?|INR)?\s*\d+(\.\d{1,2})?$"
    return bool(re.match(pattern, value, re.IGNORECASE))


def validate_quantity(quantity, unit) -> bool:
    if not has_value(quantity) or not has_value(unit):
        return False
    try:
        numeric_value = float(re.sub(r"[^\d.]", "", str(quantity)))
        if numeric_value <= 0:
            return False
    except Exception:
        return False

    valid_units = {
        "g", "kg", "mg", "ml", "l", "litre", "liter", "litres",
        "m", "cm", "mm", "piece", "pieces", "pcs", "u", "n", "count"
    }
    unit_value = str(unit).strip().lower()
    return unit_value in valid_units


def validate_date(month, year) -> bool:
    if not has_value(month) or not has_value(year):
        return False
    try:
        month_str = str(month).strip().lower()
        month_map = {
            "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
            "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
        }
        month_number = month_map.get(month_str[:3])
        if month_number is None:
            digits = re.sub(r"[^\d]", "", month_str)
            month_number = int(digits) if digits else 0

        year_number = int(re.sub(r"[^\d]", "", str(year)))
        if len(str(year_number)) == 2:
            year_number += 2000

        return 1 <= month_number <= 12 and 2000 <= year_number <= 2035
    except Exception:
        return False


def validate_consumer_care(product: Dict[str, Any]) -> bool:
    phone_valid = False
    email_valid = False
    addr_valid = False

    if has_value(product.get("consumer_care_phone")):
        digits = re.sub(r"\D", "", str(product["consumer_care_phone"]))
        phone_valid = len(digits) >= 7

    if has_value(product.get("consumer_care_email")):
        email_pattern = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
        email_valid = bool(re.match(email_pattern, str(product["consumer_care_email"])))

    if has_value(product.get("consumer_care_address")):
        addr_valid = len(str(product["consumer_care_address"]).strip()) >= 5

    return phone_valid or email_valid or addr_valid


def evaluate_rule_checks(product: Dict[str, Any], font_analysis: Dict[str, Any]) -> Dict[str, bool]:
    rules = empty_rule_data()

    # Presence checks
    rules["has_product_name"] = has_value(product.get("product_name"))
    # Rule 6(1)(b) requires the relevant entity's name AND complete address.
    rules["has_manufacturer"] = (
        has_value(product.get("manufacturer_name")) and has_value(product.get("manufacturer_address"))
    )
    rules["has_packer"] = (
        has_value(product.get("packer_name")) and has_value(product.get("packer_address"))
    )
    rules["has_importer"] = (
        has_value(product.get("importer_name")) and has_value(product.get("importer_address"))
    )
    rules["has_country_of_origin"] = has_value(product.get("country_of_origin"))
    rules["has_net_quantity"] = has_value(product.get("net_quantity")) and has_value(product.get("net_quantity_unit"))
    rules["has_mrp"] = has_value(product.get("mrp"))
    rules["has_unit_sale_price"] = has_value(product.get("unit_sale_price"))
    # Month and year are a pair; a single component is incomplete.
    rules["has_manufacture_date"] = (
        has_value(product.get("manufacture_month")) and has_value(product.get("manufacture_year"))
    )
    rules["has_best_before"] = has_value(product.get("best_before"))
    rules["has_use_by"] = has_value(product.get("use_by_date"))
    rules["has_consumer_care"] = (
        has_value(product.get("consumer_care_phone"))
        or has_value(product.get("consumer_care_email"))
        or has_value(product.get("consumer_care_address"))
    )

    # Format checks
    rules["mrp_format_valid"] = validate_mrp(product.get("mrp"))
    rules["quantity_format_valid"] = validate_quantity(product.get("net_quantity"), product.get("net_quantity_unit"))
    rules["date_format_valid"] = validate_date(product.get("manufacture_month"), product.get("manufacture_year"))
    rules["consumer_care_format_valid"] = validate_consumer_care(product)
    rules["font_size_valid"] = font_analysis.get("font_size_compliant", True)

    return rules


def compliance_check(
    product: Dict[str, Any],
    rules: Dict[str, bool],
    visual: Dict[str, Any],
    font_analysis: Dict[str, Any],
) -> Dict[str, Any]:
    violations = []
    warnings = []

    # Mandatory Declarations under Legal Metrology Rules, 2011 (Rule 6)
    if not rules["has_product_name"]:
        violations.append("Mandatory declaration missing: Generic name or product identity (Rule 6(1)(a)).")

    if not rules["has_manufacturer"] and not rules["has_packer"] and not rules["has_importer"]:
        violations.append("Mandatory declaration missing: Name and complete address of Manufacturer / Packer / Importer (Rule 6(1)(b)).")

    if not rules["has_net_quantity"]:
        violations.append("Mandatory declaration missing: Net Quantity in standard unit of weight/measure (Rule 6(1)(c)).")
    elif not rules["quantity_format_valid"]:
        violations.append("Non-standard unit format in Net Quantity. Must use recognized metric symbols (e.g. g, kg, ml, L) without pluralization (Rule 13).")

    if not rules["has_mrp"]:
        violations.append("Mandatory declaration missing: Maximum Retail Price (MRP inclusive of all taxes) (Rule 6(1)(d)).")
    elif not rules["mrp_format_valid"]:
        violations.append("Improper MRP declaration format. Must state price clearly in Indian currency with taxes included (Rule 6(1)(d)).")

    if not rules["has_manufacture_date"]:
        violations.append("Mandatory declaration missing: Month and Year of manufacture, packing, or import (Rule 6(1)(e)).")
    elif not rules["date_format_valid"]:
        warnings.append("Manufacturing date format could not be verified against standard MM/YYYY format (Rule 6(1)(e)).")

    if not rules["has_consumer_care"]:
        violations.append("Mandatory declaration missing: Consumer care contact details (phone, email, or physical address) (Rule 6(1)(f)).")
    elif not rules["consumer_care_format_valid"]:
        warnings.append("Consumer care helpline number or email address appears incomplete or non-standard.")

    # Font size & readability (Rule 7)
    if not font_analysis.get("font_size_compliant", True):
        violations.append(
            f"Font size non-compliance: Net quantity numeral height ({font_analysis.get('net_quantity_height_mm')}mm) "
            f"is below the prescribed minimum of {font_analysis.get('min_required_height_mm')}mm for this package category (Rule 7 & Schedule)."
        )

    if not font_analysis.get("readability_compliant", True):
        warnings.append("Low contrast / readability score on printed text. Declarations may not be prominently legible to consumers.")

    if visual.get("ocr_confidence", 1.0) < 0.55:
        warnings.append("Overall optical character recognition confidence is low. Ensure proper lighting and retake if necessary.")

    # Final verdict
    if violations:
        overall_status = "NON_COMPLIANT"
        review_required = True
    elif warnings:
        overall_status = "REVIEW_REQUIRED"
        review_required = True
    else:
        overall_status = "COMPLIANT"
        review_required = False

    return {
        "overall_status": overall_status,
        "violations": violations,
        "warnings": warnings,
        "review_required": review_required,
    }


# ============================================================
# COMPLETE MULTI-IMAGE INSPECTION PIPELINE
# ============================================================

def analyze_product(image_paths: List[str] | str, product_hint: Optional[str] = None, manufacturer_hint: Optional[str] = None) -> Dict[str, Any]:
    """
    Main entrypoint for Legal Metrology compliance inspection.
    Accepts 1 to 5 image paths (representing different package panels/angles).
    """
    if isinstance(image_paths, str):
        image_paths = [image_paths]

    print("\n" + "=" * 65)
    print(f"   LEGAL METROLOGY MULTI-IMAGE COMPLIANCE SCAN ({len(image_paths)} image{'s' if len(image_paths) > 1 else ''})")
    print("=" * 65)

    # 1. OpenCV Image Quality Analysis for all images
    print("\n[Step 1] Running OpenCV image quality checks...")
    quality_results = []
    for idx, p in enumerate(image_paths):
        try:
            with open(p, "rb") as f:
                content = f.read()
            q_res = analyze_image_quality(content, os.path.basename(p))
            q_res["image_index"] = idx
            quality_results.append(q_res)
        except Exception as e:
            logger.error(f"Quality check error on {p}: {e}")

    overall_quality_ready = bool(quality_results) and all(
        q.get("status") == "ready_for_ocr" for q in quality_results
    )
    avg_quality_score = int(np.mean([q.get("quality_score", 0) for q in quality_results])) if quality_results else 0

    # Do not send known-bad images into OCR. The frontend already performs this
    # pre-check, but the backend must enforce the same contract for direct API calls.
    if not overall_quality_ready:
        return {
            "success": False,
            "message": "One or more images failed quality checks. Please retake the affected image(s) before OCR.",
            "quality_analysis": {
                "overall_status": "needs_retake",
                "overall_score": avg_quality_score,
                "per_image": quality_results,
            },
        }

    # 2. Multi-Image PaddleOCR Text & Bounding Box Extraction
    print("\n[Step 2] Running PaddleOCR across all packaging panels...")
    ocr_data = extract_multi_image_ocr(image_paths)

    if not ocr_data["texts"]:
        return {
            "success": False,
            "message": "No text detected across the uploaded package images. Please provide clearer images.",
            "quality_analysis": {
                "overall_status": "ready_for_ocr",
                "overall_score": avg_quality_score,
                "per_image": quality_results,
            },
            "ocr_diagnostics": ocr_data.get("per_image", []),
        }

    combined_ocr_text = ocr_data["combined_text"]

    # 3. Groq LLM Structured Declaration Extraction
    print("\n[Step 3] Parsing structured declarations via Groq LLM...")
    product_data = extract_product_information(combined_ocr_text, product_hint=product_hint, manufacturer_hint=manufacturer_hint)

    # 4. Multi-Image Bounding Box & Field Confidence Mapping
    print("\n[Step 4] Mapping field bounding boxes and confidence scores...")
    visual_data = calculate_field_analysis_multi(product_data, ocr_data)

    # 5. Font Size & Readability Analysis (Rule 7 & Schedule)
    print("\n[Step 5] Evaluating font size & readability against Legal Metrology Schedule...")
    font_analysis = analyze_font_size_and_readability(product_data, visual_data, ocr_data)

    # 6. Rule Checks Engine
    print("\n[Step 6] Running Legal Metrology (Packaged Commodities) Rule Engine...")
    rule_data = evaluate_rule_checks(product_data, font_analysis)

    # 7. Final Compliance Verdict & Violations
    print("\n[Step 7] Generating compliance verdict & findings...")
    final_result = compliance_check(product_data, rule_data, visual_data, font_analysis)

    return {
        "success": True,
        "image_count": len(image_paths),
        "quality_analysis": {
            "overall_status": "ready_for_ocr" if overall_quality_ready else "needs_retake",
            "overall_score": avg_quality_score,
            "per_image": quality_results,
        },
        "product_information": product_data,
        "rule_checks": rule_data,
        "font_analysis": font_analysis,
        "visual_analysis": visual_data,
        "final_result": final_result,
        "ocr_text": combined_ocr_text,
    }

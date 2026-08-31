"""
db_repository.py
─────────────────
Persistent repository for Legal Metrology Inspections.
Supports MongoDB with automatic zero-configuration JSON file storage fallback.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
JSON_STORE_PATH = DATA_DIR / "inspections.json"

MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL", "mongodb://localhost:27017/legal_metrology")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "legal_metrology")
REQUIRE_MONGODB = os.getenv("REQUIRE_MONGODB", "false").lower() == "true"

_mongo_client = None
_mongo_db = None
_use_mongo = False


def _init_db():
    global _mongo_client, _mongo_db, _use_mongo
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        _mongo_client = client
        # If the URI already contains a database name (recommended for Atlas),
        # PyMongo uses that database. Otherwise fall back to MONGODB_DB_NAME.
        
        default_db = client.get_default_database()
        db_name = default_db.name if default_db is not None else MONGODB_DB_NAME
        _mongo_db = client[db_name]
        _use_mongo = True
        logger.info(f"Connected to MongoDB: {MONGODB_URI} (db={db_name})")
    except Exception as e:
        _use_mongo = False
        if REQUIRE_MONGODB:
            raise RuntimeError(f"MongoDB is required but unavailable: {e}") from e
        logger.warning(f"MongoDB not reachable ({e}). Using local JSON repository at {JSON_STORE_PATH}")


# Initialize database connection on import
_init_db()


def _read_json_data() -> List[Dict[str, Any]]:
    if not JSON_STORE_PATH.exists():
        return []
    try:
        with open(JSON_STORE_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error reading JSON store: {e}")
        return []


def _write_json_data(data: List[Dict[str, Any]]):
    try:
        with open(JSON_STORE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"Error writing to JSON store: {e}")


def generate_inspection_id() -> str:
    year = datetime.now().year
    if _use_mongo and _mongo_db is not None:
        try:
            count = _mongo_db.inspections.count_documents({})
            return f"LM-{year}-{count + 1:06d}"
        except Exception as e:
            if REQUIRE_MONGODB:
                raise RuntimeError(f"MongoDB ID generation failed: {e}") from e

    items = _read_json_data()
    return f"LM-{year}-{len(items) + 1:06d}"


def save_inspection(inspection_doc: Dict[str, Any]) -> Dict[str, Any]:
    """Save an inspection record to MongoDB or JSON store."""
    if "created_at" not in inspection_doc:
        inspection_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    if "updated_at" not in inspection_doc:
        inspection_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "id" not in inspection_doc:
        inspection_doc["id"] = uuid.uuid4().hex

    if _use_mongo and _mongo_db is not None:
        try:
            doc_to_save = dict(inspection_doc)
            _mongo_db.inspections.insert_one(doc_to_save)
            doc_to_save.pop("_id", None)
            return doc_to_save
        except Exception as e:
            if REQUIRE_MONGODB:
                raise RuntimeError(f"MongoDB insert failed: {e}") from e
            logger.warning(f"MongoDB insert failed ({e}), falling back to JSON store.")

    items = _read_json_data()
    # Insert at top
    items.insert(0, inspection_doc)
    _write_json_data(items)
    return inspection_doc


def get_inspections(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
) -> Dict[str, Any]:
    """List inspections with search, status filtering, and pagination."""
    if _use_mongo and _mongo_db is not None:
        try:
            query = {}
            if user_id:
                query["user_id"] = user_id
            if search:
                query["$or"] = [
                    {"product_name": {"$regex": search, "$options": "i"}},
                    {"inspection_id": {"$regex": search, "$options": "i"}},
                    {"manufacturer": {"$regex": search, "$options": "i"}},
                ]
            if status_filter and status_filter.upper() != "ALL":
                query["compliance_status"] = status_filter.upper()

            total = _mongo_db.inspections.count_documents(query)
            skip = (page - 1) * limit
            cursor = _mongo_db.inspections.find(query).sort("created_at", -1).skip(skip).limit(limit)
            items = []
            for doc in cursor:
                doc.pop("_id", None)
                items.append(doc)
            pages = max(1, (total + limit - 1) // limit)
            return {"items": items, "total": total, "page": page, "limit": limit, "pages": pages}
        except Exception as e:
            if REQUIRE_MONGODB:
                raise RuntimeError(f"MongoDB query failed: {e}") from e
            logger.warning(f"MongoDB query failed ({e}), falling back to JSON store.")

    all_items = _read_json_data()
    filtered = all_items

    if user_id:
        filtered = [item for item in filtered if item.get("user_id") == user_id]

    if search:
        s = search.lower()
        filtered = [
            item for item in filtered
            if s in str(item.get("product_name", "")).lower()
            or s in str(item.get("inspection_id", "")).lower()
            or s in str(item.get("manufacturer", "")).lower()
        ]

    if status_filter and status_filter.upper() != "ALL":
        filtered = [
            item for item in filtered
            if item.get("compliance_status", "").upper() == status_filter.upper()
        ]

    total = len(filtered)
    skip = (page - 1) * limit
    page_items = filtered[skip : skip + limit]
    pages = max(1, (total + limit - 1) // limit)

    return {"items": page_items, "total": total, "page": page, "limit": limit, "pages": pages}


def get_inspection_by_id(inspection_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Retrieve an inspection by its LM-ID or UUID."""
    if _use_mongo and _mongo_db is not None:
        try:
            id_query = {"$or": [{"inspection_id": inspection_id}, {"id": inspection_id}]}
            if user_id:
                id_query = {"$and": [id_query, {"user_id": user_id}]}
            doc = _mongo_db.inspections.find_one(id_query)
            if doc:
                doc.pop("_id", None)
                return doc
        except Exception as e:
            if REQUIRE_MONGODB:
                raise RuntimeError(f"MongoDB lookup failed: {e}") from e
            logger.warning(f"MongoDB get failed ({e}), checking JSON store.")

    items = _read_json_data()
    for item in items:
        if (item.get("inspection_id") == inspection_id or item.get("id") == inspection_id) and (not user_id or item.get("user_id") == user_id):
            return item
    return None


def delete_inspection(inspection_id: str, user_id: Optional[str] = None) -> bool:
    """Delete an inspection record."""
    deleted = False
    if _use_mongo and _mongo_db is not None:
        try:
            id_query = {"$or": [{"inspection_id": inspection_id}, {"id": inspection_id}]}
            if user_id:
                id_query = {"$and": [id_query, {"user_id": user_id}]}
            res = _mongo_db.inspections.delete_one(id_query)
            if res.deleted_count > 0:
                deleted = True
        except Exception as e:
            if REQUIRE_MONGODB:
                raise RuntimeError(f"MongoDB delete failed: {e}") from e
            logger.warning(f"MongoDB delete failed ({e}).")

    items = _read_json_data()
    orig_len = len(items)
    items = [
        it for it in items
        if not (
            (it.get("inspection_id") == inspection_id or it.get("id") == inspection_id)
            and (not user_id or it.get("user_id") == user_id)
        )
    ]
    if len(items) < orig_len:
        _write_json_data(items)
        deleted = True

    return deleted


def get_dashboard_stats(user_id: Optional[str] = None) -> Dict[str, Any]:
    """Calculate aggregated stats for the enforcement official dashboard."""
    inspections_data = get_inspections(user_id=user_id, limit=1000)
    items = inspections_data["items"]
    total = inspections_data["total"]

    compliant = sum(1 for it in items if it.get("compliance_status") == "COMPLIANT")
    non_compliant = sum(1 for it in items if it.get("compliance_status") == "NON_COMPLIANT")
    review_required = sum(1 for it in items if it.get("compliance_status") == "REVIEW_REQUIRED")

    compliance_rate = round((compliant / total * 100), 1) if total > 0 else 100.0

    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_scans = sum(1 for it in items if str(it.get("created_at", "")).startswith(today_str))

    # Category breakdown
    categories: Dict[str, int] = {}
    for it in items:
        cat = it.get("category") or "General Packaged Goods"
        categories[cat] = categories.get(cat, 0) + 1

    # Violation counts
    violations_summary: Dict[str, int] = {
        "MRP Format / Missing": 0,
        "Net Quantity / Unit Violation": 0,
        "Missing Manufacturer Address": 0,
        "Missing Date of Manufacture": 0,
        "Consumer Care Missing": 0,
        "Font Size Non-Compliance": 0,
        "Low OCR Readability": 0,
    }

    for it in items:
        viols = it.get("violations", [])
        for v in viols:
            v_lower = str(v).lower()
            if "mrp" in v_lower:
                violations_summary["MRP Format / Missing"] += 1
            elif "quant" in v_lower or "unit" in v_lower:
                violations_summary["Net Quantity / Unit Violation"] += 1
            elif "manuf" in v_lower:
                violations_summary["Missing Manufacturer Address"] += 1
            elif "date" in v_lower or "month" in v_lower:
                violations_summary["Missing Date of Manufacture"] += 1
            elif "consumer" in v_lower or "care" in v_lower:
                violations_summary["Consumer Care Missing"] += 1
            elif "font" in v_lower or "size" in v_lower or "height" in v_lower:
                violations_summary["Font Size Non-Compliance"] += 1
            else:
                violations_summary["Low OCR Readability"] += 1

    recent = items[:5]

    return {
        "total_inspections": total,
        "today_inspections": today_scans,
        "compliant_count": compliant,
        "non_compliant_count": non_compliant,
        "review_required_count": review_required,
        "compliance_rate": compliance_rate,
        "category_distribution": categories,
        "violations_breakdown": violations_summary,
        "recent_inspections": recent,
    }

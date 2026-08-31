import os
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"

import uuid
import shutil
import tempfile
from pathlib import Path
from typing import List, Optional
from io import BytesIO

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import uvicorn
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from product_compliance import analyze_product
from image_quality import analyze_image_quality, analyze_multiple_images_quality
import db_repository as repo
from report_generator import generate_compliance_pdf
import cloudinary
import cloudinary.uploader

# Cloudinary configuration is read from environment variables.
# Never hard-code Cloudinary credentials in source code.
CLOUDINARY_URL = os.getenv("CLOUDINARY_URL")
if not CLOUDINARY_URL:
    raise RuntimeError("CLOUDINARY_URL is required for image storage.")

cloudinary.config(cloudinary_url=CLOUDINARY_URL, secure=True)


def upload_image_to_cloudinary(content: bytes, filename: str, inspection_id: str, index: int) -> dict:
    """Upload one inspection image to Cloudinary and return its metadata."""
    stem = Path(filename or f"image_{index}.jpg").stem
    public_id = f"{inspection_id}/{index}_{uuid.uuid4().hex[:8]}_{stem}"
    result = cloudinary.uploader.upload(
        BytesIO(content),
        public_id=public_id,
        folder="legal-metrology/inspections",
        resource_type="image",
        overwrite=False,
        use_filename=False,
        unique_filename=False,
        secure=True,
    )
    return {
        "url": result.get("secure_url"),
        "public_id": result.get("public_id"),
        "width": result.get("width"),
        "height": result.get("height"),
        "format": result.get("format"),
        "bytes": result.get("bytes"),
    }


def delete_cloudinary_images(image_assets: list[dict]) -> None:
    """Best-effort cleanup of Cloudinary assets after a failed operation."""
    for asset in image_assets or []:
        public_id = asset.get("public_id") if isinstance(asset, dict) else None
        if not public_id:
            continue
        try:
            cloudinary.uploader.destroy(public_id, resource_type="image", invalidate=True)
        except Exception as exc:
            print(f"Warning: failed to delete Cloudinary asset {public_id}: {exc}")

# ============================================================
# APP SETUP
# ============================================================

app = FastAPI(
    title="Legal Metrology Compliance & Inspection AI Service",
    description="Automated AI Inspection System for Packaged Commodities Rules, 2011 (Multi-Image PaddleOCR, Groq LLM & OpenCV)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "bmp"}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16 MB


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "Legal Metrology Packaged Commodities Compliance AI Service",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api/health",
            "analyze": "POST /api/analyze (1 to 5 images)",
            "quality": "POST /api/image/quality",
            "inspections": "GET / POST /api/inspections",
            "dashboard_stats": "GET /api/dashboard/stats",
            "pdf_report": "GET /api/inspections/{id}/pdf",
        },
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Legal Metrology AI Service", "version": "2.0.0"}


# ── 1. Real-time Image Quality Check ────────────────────────
@app.post("/api/image/quality")
async def check_quality(images: List[UploadFile] = File(...)):
    """Evaluate image quality for 1 to 5 uploaded package images."""
    if not images:
        raise HTTPException(status_code=400, detail="No image files provided.")

    images_data = []
    for img in images[:5]:
        content = await img.read()
        images_data.append((content, img.filename or "image.jpg"))

    result = analyze_multiple_images_quality(images_data)
    return JSONResponse(content=result)


# Legacy single-image check endpoint (for Node.js proxy compatibility)
@app.post("/api/image/check")
async def check_quality_single(image: UploadFile = File(...)):
    """Evaluate image quality for a single uploaded package image."""
    content = await image.read()
    result = analyze_image_quality(content, image.filename or "image.jpg")
    return JSONResponse(content=result)


# ── 2. Compliance Analysis (1 to 5 Images) ───────────────────
@app.post("/api/analyze")
async def analyze(
    images: Optional[List[UploadFile]] = File(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Accepts 1 to 5 package images (Front, Back, Sides, etc.)
    Runs OpenCV quality, PaddleOCR, Groq LLM extraction, Font Size check & Legal Metrology rules.
    """
    files_to_process: List[UploadFile] = []
    if images and len(images) > 0:
        files_to_process.extend(images)
    elif image:
        files_to_process.append(image)

    if not files_to_process:
        raise HTTPException(status_code=400, detail="At least 1 product image must be provided.")

    files_to_process = files_to_process[:5]

    temp_paths = []
    try:
        for file in files_to_process:
            if not file.filename or not allowed_file(file.filename):
                raise HTTPException(status_code=400, detail=f"Unsupported file type for '{file.filename}'.")

            contents = await file.read()
            if len(contents) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds 16MB limit.")
            if len(contents) == 0:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' is empty.")

            ext = file.filename.rsplit(".", 1)[1].lower()
            tmp_filename = f"scan_{uuid.uuid4().hex[:10]}.{ext}"
            tmp_path = os.path.join(tempfile.gettempdir(), tmp_filename)
            with open(tmp_path, "wb") as f:
                f.write(contents)
            temp_paths.append(tmp_path)

        result = analyze_product(temp_paths)
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": f"Compliance analysis error: {str(e)}"},
        )
    finally:
        for p in temp_paths:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass


# ── 3. Inspections CRUD & Persistent Storage ────────────────
@app.post("/api/inspections", status_code=201)
async def create_inspection(
    product_name: str = Form(...),
    category: Optional[str] = Form(default="General Packaged Commodity"),
    manufacturer: Optional[str] = Form(default=None),
    location: Optional[str] = Form(default=None),
    notes: Optional[str] = Form(default=None),
    inspector_name: Optional[str] = Form(default="Legal Metrology Official"),
    user_id: Optional[str] = Form(default=None),
    images: Optional[List[UploadFile]] = File(None),
    image: Optional[UploadFile] = File(None),
):
    """
    Creates an inspection, uploads the original images to Cloudinary, runs the
    OCR/compliance pipeline on temporary files, and stores only image URLs and
    inspection data in MongoDB Atlas.
    """
    files_to_process: List[UploadFile] = []
    if images and len(images) > 0:
        files_to_process.extend(images)
    elif image:
        files_to_process.append(image)

    if not files_to_process:
        raise HTTPException(status_code=400, detail="At least 1 product image is required.")

    files_to_process = files_to_process[:5]
    inspection_id = repo.generate_inspection_id()
    cloudinary_assets = []
    temp_paths = []

    try:
        # Read once so the exact same bytes are used for Cloudinary + OCR.
        image_payloads = []
        for file in files_to_process:
            if not file.filename or not allowed_file(file.filename):
                raise HTTPException(status_code=400, detail=f"Unsupported file type for '{file.filename}'.")

            content = await file.read()
            if len(content) > MAX_FILE_SIZE:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' exceeds 16MB limit.")
            if len(content) == 0:
                raise HTTPException(status_code=400, detail=f"File '{file.filename}' is empty.")
            image_payloads.append((content, file.filename))

        # Upload originals to Cloudinary first. Failed/invalid inspections are
        # cleaned up in the exception handler below.
        for idx, (content, filename) in enumerate(image_payloads, start=1):
            asset = upload_image_to_cloudinary(content, filename, inspection_id, idx)
            if not asset.get("url"):
                raise RuntimeError(f"Cloudinary upload failed for '{filename}'.")
            cloudinary_assets.append(asset)

        # OCR/OpenCV needs local paths, so use temporary files only during analysis.
        for content, filename in image_payloads:
            ext = Path(filename).suffix.lower() or ".jpg"
            tmp_path = Path(tempfile.gettempdir()) / f"scan_{uuid.uuid4().hex[:10]}{ext}"
            tmp_path.write_bytes(content)
            temp_paths.append(str(tmp_path))

        analysis_result = analyze_product(
            temp_paths,
            product_hint=product_name,
            manufacturer_hint=manufacturer,
        )

        if not analysis_result.get("success", False):
            raise HTTPException(
                status_code=422,
                detail=analysis_result.get("message", "Compliance analysis could not be completed."),
            )

        final_res = analysis_result.get("final_result", {})
        overall_status = final_res.get("overall_status", "REVIEW_REQUIRED")
        image_urls = [asset["url"] for asset in cloudinary_assets]

        doc = {
            "inspection_id": inspection_id,
            "product_name": product_name.strip(),
            "category": category,
            "manufacturer": manufacturer or analysis_result.get("product_information", {}).get("manufacturer_name"),
            "location": location,
            "notes": notes,
            "inspector_name": inspector_name,
            "user_id": user_id,
            "image_urls": image_urls,
            "image_assets": cloudinary_assets,
            # Kept for frontend/backward compatibility; these are now Cloudinary URLs.
            "image_paths": image_urls,
            "original_image_path": image_urls[0] if image_urls else None,
            "image_count": len(image_urls),
            "compliance_status": overall_status,
            "violations": final_res.get("violations", []),
            "warnings": final_res.get("warnings", []),
            "product_information": analysis_result.get("product_information", {}),
            "rule_checks": analysis_result.get("rule_checks", {}),
            "font_analysis": analysis_result.get("font_analysis", {}),
            "visual_analysis": analysis_result.get("visual_analysis", {}),
            "quality_analysis": analysis_result.get("quality_analysis", {}),
            "ocr_text": analysis_result.get("ocr_text", ""),
        }

        saved_doc = repo.save_inspection(doc)
        return JSONResponse(content={"success": True, "inspection": saved_doc})

    except HTTPException:
        delete_cloudinary_images(cloudinary_assets)
        raise
    except Exception as e:
        delete_cloudinary_images(cloudinary_assets)
        raise HTTPException(status_code=500, detail=f"Failed to create inspection: {str(e)}")
    finally:
        for path in temp_paths:
            try:
                os.remove(path)
            except OSError:
                pass


@app.get("/api/inspections")
def list_inspections(
    search: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    user_id: Optional[str] = Query(default=None),
):
    """Retrieve paginated inspection records with search, status, and optional owner filtering."""
    return repo.get_inspections(search=search, status_filter=status, user_id=user_id, page=page, limit=limit)


@app.get("/api/inspections/{inspection_id}")
def get_inspection(inspection_id: str, user_id: Optional[str] = Query(default=None)):
    """Retrieve full details of an inspection by ID, optionally scoped to its owner."""
    doc = repo.get_inspection_by_id(inspection_id, user_id=user_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")
    return doc


@app.delete("/api/inspections/{inspection_id}")
def delete_inspection(inspection_id: str, user_id: Optional[str] = Query(default=None)):
    """Delete an inspection record and its Cloudinary images."""
    doc = repo.get_inspection_by_id(inspection_id, user_id=user_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")

    deleted = repo.delete_inspection(inspection_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")

    delete_cloudinary_images(doc.get("image_assets", []))
    return {"success": True, "message": f"Inspection '{inspection_id}' deleted successfully."}


# ── 4. Official PDF Report Generation ───────────────────────
@app.get("/api/inspections/{inspection_id}/pdf")
def download_inspection_pdf(inspection_id: str, user_id: Optional[str] = Query(default=None)):
    """Generate and download official PDF compliance report."""
    doc = repo.get_inspection_by_id(inspection_id, user_id=user_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Inspection '{inspection_id}' not found.")

    try:
        pdf_stream = generate_compliance_pdf(doc)
        filename = f"Legal_Metrology_Inspection_{inspection_id}.pdf"
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(e)}")


# ── 5. Enforcement Dashboard Analytics ───────────────────────
@app.get("/api/dashboard/stats")
def dashboard_stats(user_id: Optional[str] = Query(default=None)):
    """Retrieve dashboard statistics and violation trends, optionally scoped to one officer."""
    return repo.get_dashboard_stats(user_id=user_id)


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    print("\n>>> Legal Metrology AI Compliance Service starting at http://localhost:8000\n")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)

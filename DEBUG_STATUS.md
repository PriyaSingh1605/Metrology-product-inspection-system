# Debug Status

## Active architecture

React frontend -> Node/Express backend -> FastAPI AI service -> OpenCV quality -> PaddleOCR -> Groq extraction -> rule engine -> repository -> PDF report.

## Fixes applied

- Removed duplicate legacy Python backend modules from the cleaned project.
- Fixed duplicate function definitions in `ai-service/product_compliance.py`.
- Added deterministic OCR extraction fallback for common MRP, quantity, manufacture date, manufacturer/packer/importer and consumer-care patterns.
- Groq extraction now supplements the deterministic parser instead of being the single point of failure.
- OCR context from the officer-entered product name can help match product identity, but user-entered metadata is not blindly counted as package evidence.
- Manufacturer/packer/importer parsing now recognizes `Manufactured by`, `Mfg. by`, `Packed by`, and `Imported by` patterns without confusing `Mfg. Date` with a manufacturer.
- Added support for common 1800 consumer-care numbers.
- Python service now loads `ai-service/.env` using an absolute path.
- Inspection creation rejects failed AI analysis instead of saving an empty `REVIEW_REQUIRED` record.
- Increased Node -> Python inspection timeout to 4 minutes for multi-image OCR + Groq.
- Removed runtime inspection uploads/data from the source package.
- Added `ai-service/.env.example`.
- Updated README setup/run instructions.

## Validation

- Python compilation: PASS
- Node syntax checks: PASS
- AI image-quality tests: 20 passed

## Important

The full PaddleOCR + Groq pipeline requires the project's Python dependencies and a valid `GROQ_API_KEY` on the user's machine. The source package intentionally does not include secrets, virtual environments, node_modules, or model caches.

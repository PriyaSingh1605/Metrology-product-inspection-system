# Docker + Cloud Storage Setup

This project uses:
- **Cloudinary** for original product images.
- **MongoDB Atlas** for users and inspection data.
- **Python/FastAPI** for PaddleOCR/OpenCV/compliance analysis.
- **Node/Express** as the authenticated API gateway.

## 1. Create local environment files

Copy:

```text
ai-service/.env.example -> ai-service/.env
backend/.env.example -> backend/.env
.env.example -> .env
```

Fill in the real MongoDB Atlas, Cloudinary, Groq, and JWT values. Never commit these `.env` files.

## 2. MongoDB Atlas

Use a URI containing the database name, for example:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/legal_metrology?retryWrites=true&w=majority
```

Allow the deployment server's IP in MongoDB Atlas Network Access.

## 3. Cloudinary

Set:

```text
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET:CLOUD_NAME
```

The Python service uploads inspection images to `legal-metrology/inspections/...`. MongoDB stores the resulting secure URLs and Cloudinary public IDs.

## 4. Run with Docker

From the project root:

```bash
docker compose build
docker compose up
```

Local URLs:
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- AI service: http://localhost:8000

## 5. Image/data flow

```text
Browser
  -> Node backend
  -> Python AI service
  -> temporary file for OCR only
  -> Cloudinary (permanent image)
  -> MongoDB Atlas (inspection JSON + Cloudinary URL)
```

Images are not kept permanently inside the Docker container.

# PackGuard AI - Legal Metrology Product Inspection System

Automated compliance checking for packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011.

---

## System Architecture

```
Frontend (React + Vite)        ->  http://localhost:5173
      |  JWT-authenticated API calls
Node.js Backend (Express)      ->  http://localhost:5000
      |  Proxies to Python AI service
Python AI Service (FastAPI)    ->  http://localhost:8000
         PaddleOCR + Groq LLM + Rule Engine
```

### Full Inspection Flow

1. Frontend: Officer uploads 1-5 product packaging images
2. Image Quality Check: Python AI service checks each image for blur, brightness, contrast, resolution (OpenCV)
3. If quality passes: Officer fills inspection details and submits
4. PaddleOCR: Extracts text + bounding boxes from all packaging panels
5. Font Size Analysis: Bounding box heights used to estimate numeral height vs Legal Metrology Schedule minimums (Rule 7)
6. Groq LLM: Structured extraction of mandatory declarations from OCR text (product name, MRP, net qty, manufacturer, dates, consumer care)
7. Rule Engine: Checks all declarations against Legal Metrology (Packaged Commodities) Rules 2011 (Rule 6, 13, Schedule)
8. Compliance Verdict: COMPLIANT / NON_COMPLIANT / REVIEW_REQUIRED
9. Storage: Inspection saved to MongoDB (or JSON fallback)
10. PDF Report: Downloadable official compliance certificate via ReportLab
11. Frontend: Results displayed with violations, warnings, extracted fields, evidence images

---

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- MongoDB Community Edition running on localhost:27017
- A Groq API key (free at https://console.groq.com)

---

## Setup

### 1. Python AI Service

Use Python 3.11 for the most reliable PaddleOCR/PaddlePaddle setup.

```powershell
cd ai-service
conda create -n metrology-ai python=3.11 -y
conda activate metrology-ai
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create `ai-service/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=legal_metrology
```

### 2. Node.js Backend

```powershell
cd backend
npm install
```

Create `backend/.env` using the existing `.env.example` and set:

```env
PORT=5000
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=legal_metrology
JWT_SECRET_KEY=your-long-random-secret
JWT_EXPIRES_IN=1d
PYTHON_SERVICE_URL=http://localhost:8000
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3. React Frontend

```powershell
cd frontend
npm install
```

Set `frontend/.env` to:

```env
VITE_API_BASE_URL=http://localhost:5000
```

---

## Running the Application

### Manual (recommended for debugging)

Terminal 1 - Python AI Service:

```powershell
cd ai-service
conda activate metrology-ai
python main.py
```

Terminal 2 - Node.js Backend:

```powershell
cd backend
npm run dev
```

Terminal 3 - React Frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173`.

### One-click (Windows)

`start-all.bat` can launch all three services when Python, Node.js and the required environment are already available on PATH. For first-time setup and debugging, use the three-terminal method above.

## First-Time Login

1. Navigate to http://localhost:5173 (redirects to /login)
2. Click Register to create an officer account
3. Use credentials to Sign In

---

## Compliance Rules Checked

| Rule | Description |
|------|-------------|
| Rule 6(1)(a) | Product identity / generic name |
| Rule 6(1)(b) | Manufacturer / Packer / Importer name and address |
| Rule 6(1)(c) | Net quantity with standard metric unit |
| Rule 6(1)(d) | Maximum Retail Price (MRP inclusive of all taxes) |
| Rule 6(1)(e) | Month and Year of manufacture / packing |
| Rule 6(1)(f) | Consumer care contact (phone / email / address) |
| Rule 7 + Schedule | Minimum font size for net quantity numerals |
| Rule 13 | Standard metric units only (g, kg, ml, L, pcs) |
| Rule 6(10) | Country of origin (for imported goods) |
| Rule 6(11) | Unit sale price declaration |

---

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, Lucide icons |
| Backend | Node.js, Express, JWT auth, Multer, Mongoose |
| AI Service | FastAPI, PaddleOCR v3, Groq LLM (llama-3.3-70b), OpenCV |
| Database | MongoDB (with JSON file fallback) |
| PDF Reports | ReportLab |
| Image Quality | OpenCV (blur/brightness/contrast/resolution) |

---

## Troubleshooting

- Cannot connect to backend: Ensure Node.js is running on port 5000 and MongoDB is running.
- Compliance analysis failed: Ensure Python AI service is running on port 8000 and GROQ_API_KEY is set in ai-service/.env.
- PaddleOCR first run: Downloads ~100MB model files on first run. Wait for completion.
- Images not loading: Node.js proxies /uploads to Python service. Ensure both services are running.
- MongoDB not available: Install from https://www.mongodb.com/try/download/community and run mongod.


## Clean architecture

The active application uses three services:

- `frontend/` — React + Vite UI
- `backend/` — Node.js + Express authentication/API gateway
- `ai-service/` — FastAPI + PaddleOCR + Groq + rule engine + reports + inspection repository

Legacy duplicate Python backend code has been removed. The Node backend delegates AI/compliance work to `ai-service`.

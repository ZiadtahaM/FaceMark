from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import cv2
import numpy as np
import base64
import pickle
import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from deepface import DeepFace
from scipy.spatial.distance import cosine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load model on startup
    print("[INFO] Pre-loading Facenet512 model...")
    dummy = np.zeros((160, 160, 3), dtype=np.uint8)
    DeepFace.represent(dummy, model_name="Facenet512", enforce_detection=False, detector_backend="skip")
    print("[INFO] Model loaded successfully!")
    yield

app = FastAPI(lifespan=lifespan)

EMBEDDINGS_FILE = "./embeddings/embs_facenet512.pkl"
os.makedirs("./embeddings", exist_ok=True)
os.makedirs("./faces", exist_ok=True)

def base64_to_image(b64: str):
    if "," in b64:
        b64 = b64.split(",")[1]
    b64 = b64.strip()
    padding = 4 - len(b64) % 4
    if padding != 4:
        b64 += "=" * padding
    img_bytes = base64.b64decode(b64)
    arr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def get_embedding(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    rgb = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
    result = DeepFace.represent(rgb, model_name="Facenet512", enforce_detection=False, detector_backend="skip")
    return result[0]["embedding"]

def load_embeddings():
    if os.path.exists(EMBEDDINGS_FILE):
        with open(EMBEDDINGS_FILE, "rb") as f:
            return pickle.load(f)
    return {}

def save_embeddings(db):
    with open(EMBEDDINGS_FILE, "wb") as f:
        pickle.dump(db, f)

def clamp(value: float) -> float:
    return float(max(0.0, min(1.0, value)))

class UploadRequest(BaseModel):
    studentId: Optional[str] = None
    student_id: Optional[str] = None
    imagesBase64: Optional[List[str]] = None
    images_base64: Optional[List[str]] = None
    images: Optional[List[str]] = None
    name: Optional[str] = None
    confidence_threshold: Optional[float] = 0.6

class RecognizeRequest(BaseModel):
    imageBase64: Optional[str] = None
    image_base64: Optional[str] = None
    image: Optional[str] = None
    confidence_threshold: Optional[float] = 0.65

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/upload/batch")
def upload_batch(req: UploadRequest):
    student_id = req.studentId or req.student_id
    images = req.imagesBase64 or req.images_base64 or req.images

    if not student_id or not images:
        raise HTTPException(status_code=400, detail="studentId and imagesBase64 are required")

    embeddings = []
    for b64 in images:
        img = base64_to_image(b64)
        if img is None:
            continue
        try:
            emb = get_embedding(img)
            embeddings.append(emb)
        except Exception:
            continue

    if not embeddings:
        raise HTTPException(status_code=400, detail="No valid faces found in provided images")

    avg_embedding = np.mean(embeddings, axis=0).tolist()

    db = load_embeddings()
    db[student_id] = avg_embedding
    save_embeddings(db)

    return {
        "studentId": student_id,
        "name": req.name or "",
        "embedding": avg_embedding,
        "embeddings": [],
        "imagesProcessed": len(embeddings),
        "facesDetected": len(embeddings),
        "dateCreated": datetime.now(timezone.utc).isoformat(),
        "versionOfModel": "Facenet512",
        "status": "success",
        "message": f"Successfully registered {len(embeddings)} faces",
        "success": True
    }

@app.post("/recognize")
def recognize(req: RecognizeRequest):
    image = req.imageBase64 or req.image_base64 or req.image

    if not image:
        raise HTTPException(status_code=400, detail="imageBase64 is required")

    try:
        img = base64_to_image(image)
    except Exception:
        return {
            "studentId": None,
            "name": None,
            "match": 0.0,
            "confidenceScore": 0.0,
            "versionOfModel": "Facenet512",
            "matchStatus": "NO_FACE_DETECTED",
            "status": "NO_FACE_DETECTED",
            "matched": False,
            "processingTimeMs": 0
        }

    if img is None:
        return {
            "studentId": None,
            "name": None,
            "match": 0.0,
            "confidenceScore": 0.0,
            "versionOfModel": "Facenet512",
            "matchStatus": "NO_FACE_DETECTED",
            "status": "NO_FACE_DETECTED",
            "matched": False,
            "processingTimeMs": 0
        }

    try:
        target_emb = get_embedding(img)
    except Exception:
        return {
            "studentId": None,
            "name": None,
            "match": 0.0,
            "confidenceScore": 0.0,
            "versionOfModel": "Facenet512",
            "matchStatus": "NO_FACE_DETECTED",
            "status": "NO_FACE_DETECTED",
            "matched": False,
            "processingTimeMs": 0
        }

    db = load_embeddings()
    if not db:
        raise HTTPException(status_code=404, detail="No embeddings in database yet")

    best_match = None
    best_similarity = 0.0

    for student_id, db_emb in db.items():
        raw_sim = 1 - cosine(target_emb, db_emb)
        if np.isnan(raw_sim) or np.isinf(raw_sim):
            raw_sim = 0.0
        sim = clamp(raw_sim)
        if sim > best_similarity:
            best_similarity = sim
            best_match = student_id

    threshold = req.confidence_threshold or 0.65
    matched = bool(best_similarity >= threshold)
    similarity = clamp(round(best_similarity, 4))

    return {
        "studentId": best_match if matched else None,
        "name": best_match if matched else None,
        "match": float(similarity),
        "confidenceScore": float(similarity),
        "versionOfModel": "Facenet512",
        "matchStatus": "MATCH" if matched else "NO_MATCH",
        "status": "MATCH" if matched else "NO_MATCH",
        "matched": matched,
        "processingTimeMs": 0
    }
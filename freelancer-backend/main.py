from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
import base64
from pathlib import Path
import shutil
import os
from io import BytesIO
from PIL import Image

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create storage directories
Path("storage/freelancers").mkdir(parents=True, exist_ok=True)
Path("storage/temp").mkdir(parents=True, exist_ok=True)

class LivenessCheck(BaseModel):
    image: str

class VerificationResponse(BaseModel):
    result: str
    confidence: Optional[float] = None

def decode_base64_image(base64_string: str) -> np.ndarray:
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise ValueError("Failed to decode image")
            
        return img
    except Exception as e:
        raise ValueError(f"Error decoding image: {str(e)}")

def detect_face(image: np.ndarray):
    try:
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return False, 0.0
            
        # Basic liveness check using image quality
        face_x, face_y, face_w, face_h = faces[0]
        face_roi = gray[face_y:face_y+face_h, face_x:face_x+face_w]
        blur = cv2.Laplacian(face_roi, cv2.CV_64F).var()
        
        if blur < 100:  # Threshold for blur detection
            return False, blur/200
            
        return True, min(blur/200, 1.0)
        
    except Exception as e:
        print(f"Error in face detection: {str(e)}")
        return False, 0.0

@app.post("/register_freelancer/")
async def register_freelancer(
    name: str = Form(...),
    address: str = Form(...),
    image: UploadFile = File(...)
):
    try:
        # Create unique filename
        filename = f"{name}_{address}".replace(" ", "_").lower()
        file_path = f"storage/freelancers/{filename}.jpg"
        
        # Save the uploaded image
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        return {"message": "Freelancer registered successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify_liveness/", response_model=VerificationResponse)
async def verify_liveness(check: LivenessCheck):
    try:
        # Decode the base64 image
        image = decode_base64_image(check.image)
        
        # Perform liveness detection
        is_live, confidence = detect_face(image)
        
        if is_live:
            return VerificationResponse(
                result="Live person detected",
                confidence=confidence
            )
        else:
            return VerificationResponse(
                result="Fake/No face detected",
                confidence=confidence
            )
            
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0000", port=8000)
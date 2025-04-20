import base64
import cv2
import mediapipe as mp
import numpy as np
import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

# --- Pydantic Models ---
class AnalyzeFrameRequest(BaseModel):
    imageData: str # Base64 encoded image string

class AnalyzeFrameResponse(BaseModel):
    stressLevel: int # Calculated stress level (0-100)
    faceDetected: bool # Whether a face was detected

# --- FastAPI Router ---
router = APIRouter()

# --- MediaPipe Initialization ---
mp_face_mesh = mp.solutions.face_mesh
# Initialize with static_image_mode=True for processing individual images,
# max_num_faces=1 for performance, refine_landmarks=True for detailed mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)
# --- Helper Functions (Ported from JS) ---
# TODO: Port the calculateDistance and calculateStressFromLandmarks functions to Python

def calculate_distance(p1, p2):
    """Calculate Euclidean distance between two MediaPipe landmarks."""
    return math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2 + (p1.z - p2.z)**2)

def calculate_stress_from_landmarks(landmarks):
    """Calculate stress score from MediaPipe face landmarks."""
    if not landmarks or len(landmarks) < 478:
        # print("Warning: Not enough landmarks for stress calculation.")
        return 0

    try:
        # Landmark indices based on MediaPipe Face Mesh (478 landmarks)
        # 1. Brow Furrowing (distance between landmarks 55 and 285)
        left_inner_brow = landmarks[55]
        right_inner_brow = landmarks[285]
        # Use 2D distance for simplicity/robustness if Z is unreliable
        brow_distance = math.sqrt((left_inner_brow.x - right_inner_brow.x)**2 + (left_inner_brow.y - right_inner_brow.y)**2)

        # 2. Eye Aperture (average vertical distance between eyelids)
        # Left Eye: Top (159), Bottom (145)
        # Right Eye: Top (386), Bottom (374)
        left_eye_top = landmarks[159]
        left_eye_bottom = landmarks[145]
        left_eye_aperture = abs(left_eye_top.y - left_eye_bottom.y)

        right_eye_top = landmarks[386]
        right_eye_bottom = landmarks[374]
        right_eye_aperture = abs(right_eye_top.y - right_eye_bottom.y)
        avg_eye_aperture = (left_eye_aperture + right_eye_aperture) / 2

        # 3. Mouth Corner Position (relative vertical position to nose tip - landmark 1)
        # Left Corner (61), Right Corner (291)
        left_mouth_corner = landmarks[61]
        right_mouth_corner = landmarks[291]
        nose_tip = landmarks[1]
        avg_mouth_corner_y = (left_mouth_corner.y + right_mouth_corner.y) / 2
        mouth_relative_y = avg_mouth_corner_y - nose_tip.y # Higher value means lower corners

        # --- Normalization ---
        # Normalize distances by inter-pupillary distance for scale invariance
        inter_pupil_distance = math.sqrt(
            (landmarks[473].x - landmarks[468].x)**2 + 
            (landmarks[473].y - landmarks[468].y)**2
        ) 
        if inter_pupil_distance < 1e-6: # Avoid division by zero
             # print("Warning: Inter-pupil distance too small.")
             return 0

        norm_brow_distance = brow_distance / inter_pupil_distance
        norm_eye_aperture = avg_eye_aperture / inter_pupil_distance
        norm_mouth_relative_y = mouth_relative_y / inter_pupil_distance

        # --- Scoring with Clamped Linear Scaling (Refined Approach) ---
        # Define estimated 'relaxed' and 'stressed' ratios.
        # These values are still heuristics and may need further tuning.
        relaxed_brow_ratio = 0.30
        stressed_brow_ratio = 0.15 # Assumed ratio at max stress from brow furrowing
        
        relaxed_eye_ratio = 0.11 # Slightly increased relaxed baseline (was 0.10)
        stressed_eye_ratio = 0.10 # Make very close to relaxed for high sensitivity (was 0.085)
        
        relaxed_mouth_ratio = 0.30
        stressed_mouth_ratio = 0.40 # Assumed ratio at max stress from mouth downturn

        # Calculate scores using clamped linear interpolation between relaxed and stressed states
        
        # Brow Score: Increases as norm_brow_distance decreases
        brow_scale_factor = relaxed_brow_ratio - stressed_brow_ratio
        if brow_scale_factor <= 1e-6: # Avoid division by zero
             brow_score = 0
        else:
            brow_score = 100 * (relaxed_brow_ratio - norm_brow_distance) / brow_scale_factor
        brow_score = max(0, min(100, brow_score)) # Clamp [0, 100]

        # Eye Score: Increases as norm_eye_aperture decreases
        eye_scale_factor = relaxed_eye_ratio - stressed_eye_ratio
        if eye_scale_factor <= 1e-6:
             eye_score = 0
        else:
             eye_score = 100 * (relaxed_eye_ratio - norm_eye_aperture) / eye_scale_factor
        eye_score = max(0, min(100, eye_score)) # Clamp [0, 100]

        # Mouth Score: Increases as norm_mouth_relative_y increases (corners go down)
        mouth_scale_factor = stressed_mouth_ratio - relaxed_mouth_ratio
        if mouth_scale_factor <= 1e-6:
             mouth_score = 0
        else:
             mouth_score = 100 * (norm_mouth_relative_y - relaxed_mouth_ratio) / mouth_scale_factor
        mouth_score = max(0, min(100, mouth_score)) # Clamp [0, 100]

        # --- Combine Scores (Weighted Average) ---
        # Weights can be adjusted if certain features are deemed more indicative of stress
        # Increase eye weight, decrease brow weight
        combined_score = (brow_score * 0.3) + (eye_score * 0.5) + (mouth_score * 0.2)
        # Final clamping just in case, though individual scores are already clamped
        combined_score = max(0, min(100, combined_score)) 

        # print(f"Norm Ratios: Brow={norm_brow_distance:.3f}, Eye={norm_eye_aperture:.3f}, MouthY={norm_mouth_relative_y:.3f}") # Debug
        # print(f"Scores: Brow={brow_score:.1f}, Eye={eye_score:.1f}, Mouth={mouth_score:.1f} -> Combined={combined_score:.0f}") # Debug

        return int(round(combined_score))

    except Exception as e:
        print(f"Error calculating stress from landmarks: {e}")
        return 0 # Return neutral score on error

# --- API Endpoint ---
@router.post("/analyze-frame", response_model=AnalyzeFrameResponse)
def analyze_frame(request: AnalyzeFrameRequest):
    """Analyzes a single image frame for facial landmarks and calculates stress."""
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.imageData.split(',')[1]) # Remove 'data:image/jpeg;base64,' prefix
        nparr = np.frombuffer(image_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Could not decode image data.")

        # Convert the BGR image to RGB
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Process the image and find face landmarks
        results = face_mesh.process(img_rgb)

        face_detected = False
        stress_level = 0 # Default value if no face is detected

        if results.multi_face_landmarks:
            face_detected = True
            # Assuming only one face, get its landmarks
            landmarks = results.multi_face_landmarks[0].landmark
            # Calculate stress
            stress_level = calculate_stress_from_landmarks(landmarks)
            print(f"Detected face. Calculated stress: {stress_level}") # Keep print for debugging
        else:
            print("No face detected in the frame.") # Keep print for debugging

        return AnalyzeFrameResponse(stressLevel=stress_level, faceDetected=face_detected)

    except Exception as e:
        print(f"Error processing frame: {e}")
        # Return a default response or raise an HTTP exception
        # Instead of returning a default response, raise an exception to properly handle errors
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")

# Ensure the face_mesh resources are released on shutdown (optional, depends on app lifecycle)
# def shutdown_event():
#    face_mesh.close()
# router.add_event_handler("shutdown", shutdown_event)


import cv2
import numpy as np

# Robust MediaPipe Import
mp_face_detection = None
try:
    import mediapipe as mp
    print(f"MediaPipe found at: {mp.__file__}")
    if hasattr(mp, 'solutions'):
        mp_face_detection = mp.solutions.face_detection
    else:
        from mediapipe.python.solutions import face_detection as mp_face_detection
except Exception as e:
    print(f"MediaPipe Import Warning: {e}")

class HeadcountProcessor:
    def __init__(self):
        if mp_face_detection:
            print("MediaPipe Face Detection loaded successfully.")
        else:
            print("MediaPipe Face Detection NOT loaded. Using OpenCV fallback.")

    def count_students(self, image_bytes):
        # Convert image bytes to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            print("Error: Could not decode image.")
            return 0

        # Convert to RGB (MediaPipe requirement)
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        count = 0
        if mp_face_detection:
            try:
                # model_selection 1 is better for faces further than 2m (classrooms)
                with mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.3) as face_detection:
                    results = face_detection.process(image_rgb)
                    
                    if results.detections:
                        count = len(results.detections)
                        print(f"MediaPipe Headcount: {count}")
                        return count
            except Exception as e:
                print(f"MediaPipe Face Detection Error: {e}")
        
        # Fallback: Basic Face Detection using Haar Cascades
        try:
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            # Profile face cascade is also useful for side views
            profile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Detect frontal faces
            frontal_faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            # Detect profile faces
            profile_faces = profile_cascade.detectMultiScale(gray, 1.1, 4)
            
            # Very basic union/combination (not perfect, but better than nothing)
            total_detected = list(frontal_faces) + list(profile_faces)
            count = len(total_detected)
            
            print(f"Fallback Headcount (Faces + Profiles): {count}")
            # If no faces/profiles but image exists, return 1 as a baseline for the classroom
            return max(count, 1) 
        except Exception as e:
            print(f"Fallback Error in headcount: {e}")
            return 1 # Baseline fallback

# For testing
if __name__ == "__main__":
    processor = HeadcountProcessor()
    # image_path = 'test.jpg'
    # with open(image_path, 'rb') as f:
    #     print(processor.count_students(f.read()))

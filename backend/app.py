from flask import Flask, request, jsonify
from flask_cors import CORS
from headcount_processor import HeadcountProcessor
from stt_processor import STTProcessor
import os
import datetime

app = Flask(__name__)
CORS(app)

# Configure Local Storage
UPLOAD_FOLDER = 'uploads'
IMAGES_FOLDER = os.path.join(UPLOAD_FOLDER, 'images')
AUDIO_FOLDER = os.path.join(UPLOAD_FOLDER, 'audio')

for folder in [IMAGES_FOLDER, AUDIO_FOLDER]:
    if not os.path.exists(folder):
        os.makedirs(folder)

headcount_proc = HeadcountProcessor()
stt_proc = STTProcessor()

@app.route('/count-students', methods=['POST'])
def count_students():
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    image_bytes = image_file.read()
    
    # Save Image Locally
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"capture_{timestamp}.jpg"
    filepath = os.path.join(IMAGES_FOLDER, filename)
    with open(filepath, 'wb') as f:
        f.write(image_bytes)
    
    count = headcount_proc.count_students(image_bytes)
    return jsonify({
        "count": count,
        "filename": filename
    })

@app.route('/process-rollcall', methods=['POST'])
def process_rollcall():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio provided"}), 400
    
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    
    # Save Audio Locally
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"rollcall_{timestamp}.wav"
    filepath = os.path.join(AUDIO_FOLDER, filename)
    with open(filepath, 'wb') as f:
        f.write(audio_bytes)
        
    text = stt_proc.process_audio(audio_bytes)
    roll_numbers = stt_proc.extract_roll_numbers(text)
    
    print(f"[SUCCESS] Processed Roll Call. Text: '{text}', Found: {roll_numbers}")
    
    return jsonify({
        "text": text,
        "roll_numbers": roll_numbers,
        "filename": filename
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

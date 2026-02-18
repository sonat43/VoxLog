import speech_recognition as sr
import io
import os
import sys

# --- FFMPEG Auto-Detection (Must be before pydub import) ---
backend_dir = os.path.dirname(os.path.abspath(__file__))
ffmpeg_folders = [f for f in os.listdir(backend_dir) if f.startswith('ffmpeg-') and os.path.isdir(os.path.join(backend_dir, f))]

if ffmpeg_folders:
    ffmpeg_path = os.path.join(backend_dir, ffmpeg_folders[0], 'bin')
    if os.path.exists(ffmpeg_path):
        if ffmpeg_path not in os.environ['PATH']:
            os.environ['PATH'] += os.pathsep + ffmpeg_path
            print(f"[DEBUG] Added local FFMPEG to environment PATH: {ffmpeg_path}")

from pydub import AudioSegment

class STTProcessor:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    def process_audio(self, audio_bytes):
        try:
            print(f"[DEBUG] Processing audio packet of size: {len(audio_bytes)} bytes")
            # Web browsers typically record in webm or opus format
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
            
            # 1. Normalize Audio (makes it clearer/louder)
            audio = audio.normalize()
            
            # Ensure pydub successfully decoded the audio
            if len(audio) == 0:
                print("[DEBUG] Audio is empty after decoding")
                return ""
                
            wav_io = io.BytesIO()
            audio.export(wav_io, format="wav")
            wav_io.seek(0)
            
            with sr.AudioFile(wav_io) as source:
                # 2. Adjust for ambient noise
                # self.recognizer.adjust_for_ambient_noise(source)
                audio_data = self.recognizer.record(source)
                try:
                    # 3. Use en-IN for better Indian accent support as primary
                    text = self.recognizer.recognize_google(audio_data, language='en-IN')
                    print(f"[DEBUG] Transcribed Text (en-IN): {text}")
                    return text
                except sr.UnknownValueError:
                    # Fallback to en-US if en-IN failed
                    try:
                        text = self.recognizer.recognize_google(audio_data, language='en-US')
                        print(f"[DEBUG] Transcribed Text (en-US fallback): {text}")
                        return text
                    except:
                        print("[DEBUG] Google Speech Recognition could not understand audio")
                        return ""
                except sr.RequestError as e:
                    print(f"[DEBUG] Google Speech API Unavailable: {e}")
                    return ""
                except Exception as e:
                    print(f"[DEBUG] Recognition error: {e}")
                    return ""
        except Exception as e:
            error_msg = str(e).lower()
            print(f"[DEBUG] process_audio exception: {error_msg}")
            if "ffmpeg" in error_msg or "ffprobe" in error_msg or "system cannot find the file specified" in error_msg:
                print("[CRITICAL] FFMPEG is not installed or not in PATH.")
                return "ERROR: FFMPEG_MISSING"
            return ""

    def extract_roll_numbers(self, text, valid_rolls=None):
        """
        Robustly extracts and normalizes roll numbers from speech text.
        Args:
            text (str): Raw transcription from STT engine.
            valid_rolls (list): Optional list of valid roll numbers (strings) for validation and smart splitting.
        Returns:
            list: Cleaned, validated, unique list of roll numbers.
        """
        if not text:
            return []

        # 1. Configuration & Maps
        word_to_num = {
            'zero': '0', 'one': '1', 'won': '1', 'on': '1', 'o': '1', 'two': '2', 'to': '2', 'too': '2', 'do': '2',
            'three': '3', 'tree': '3', 'the': '3', 'four': '4', 'for': '4', 'fore': '4', 'five': '5', 'fine': '5',
            'fire': '5', 'six': '6', 'sex': '6', 'sick': '6', 'seven': '7', 'heaven': '7', 'eight': '8', 'ate': '8',
            'h': '8', 'nine': '9', 'night': '9', 'line': '9', 'ten': '10', 'then': '10', 'pen': '10',
            'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14',
            'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18',
            'nineteen': '19', 'twenty': '20'
        }
        
        # 2. Pre-processing
        # Replace common separators with spaces to isolate numbers
        text = text.lower().replace(',', ' ').replace('.', ' ').replace(' next ', ' ')
        
        extracted = []
        import re

        # 3. Process words directly (captures "one", "two", "1", "2")
        raw_words = text.split()
        for word in raw_words:
            # Clean word of all non-alphanumeric chars
            clean_word = re.sub(r'[^a-z0-9]', '', word)
            
            # Case A: Word is a number word ("one")
            if clean_word in word_to_num:
                extracted.append(word_to_num[clean_word])
            # Case B: Word is already digits ("12")
            elif clean_word.isdigit():
                # Handling Smart Splitting (Goal: "12" -> "1", "2" if 12 is invalid)
                if valid_rolls and clean_word not in valid_rolls:
                    # If this combined number isn't valid, try splitting it into individual digits
                    # only if those individual digits are valid or if we have no choice
                    for char in clean_word:
                        extracted.append(char)
                else:
                    # Either it's valid, or we have no valid_rolls to check against
                    extracted.append(clean_word)

        # 4. Global RegEx fallback for joined text (e.g. "roll12")
        # Find all digit groups in the raw text that word split might have missed
        all_digit_groups = re.findall(r'\d+', text)
        for group in all_digit_groups:
            if group not in extracted:
                if valid_rolls and group not in valid_rolls:
                    for char in group:
                        if char not in extracted: extracted.append(char)
                else:
                    extracted.append(group)

        # 5. Final Cleaning: Duplicates & Validation
        final_list = []
        seen = set()
        
        # Ensure list contains only strings of sanitized integers
        for item in extracted:
            val = str(int(item)) # "01" -> "1"
            if val not in seen:
                # If valid_rolls provided, filter strictly
                if valid_rolls:
                    if val in valid_rolls:
                        final_list.append(val)
                        seen.add(val)
                else:
                    final_list.append(val)
                    seen.add(val)
        
        print(f"[DEBUG] Raw Text: '{text}'")
        print(f"[DEBUG] Valid Rolls Received (first 20): {valid_rolls[:20] if valid_rolls else 'None'}")
        print(f"[DEBUG] Final Normalized Rolls: {final_list}")
        
        return final_list

# For testing
if __name__ == "__main__":
    processor = STTProcessor()
    # test_text = "Present roll number 1, 2, 5, 10 and 15"
    # print(processor.extract_roll_numbers(test_text))

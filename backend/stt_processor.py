import speech_recognition as sr
import io
from pydub import AudioSegment

class STTProcessor:
    def __init__(self):
        self.recognizer = sr.Recognizer()

    def process_audio(self, audio_bytes):
        # The audio might be in different formats from the browser (e.g. webm/opus)
        # We use pydub to convert it to wav which SpeechRecognition likes better
        try:
            print(f"[DEBUG] Processing audio packet of size: {len(audio_bytes)} bytes")
            # Web browsers typically record in webm or opus format
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
            
            # Ensure pydub successfully decoded the audio
            if len(audio) == 0:
                print("[DEBUG] Audio is empty after decoding")
                return ""
                
            wav_io = io.BytesIO()
            audio.export(wav_io, format="wav")
            wav_io.seek(0)
            
            with sr.AudioFile(wav_io) as source:
                audio_data = self.recognizer.record(source)
                try:
                    # Added timeout to avoid hanging if internet is extremely slow
                    text = self.recognizer.recognize_google(audio_data, timeout=10)
                    print(f"[DEBUG] Transcribed Text: {text}")
                    return text
                except sr.UnknownValueError:
                    print("[DEBUG] Google Speech Recognition could not understand audio (Too quiet or unclear)")
                    return ""
                except sr.RequestError as e:
                    print(f"[DEBUG] Google Speech API Unavailable: {e}. Check server internet connection.")
                    return ""
                except Exception as e:
                    print(f"[DEBUG] Recognition error: {e}")
                    return ""
        except Exception as e:
            print(f"STT Error: {e}")
            error_msg = str(e).lower()
            if "ffmpeg" in error_msg or "ffprobe" in error_msg:
                print("[CRITICAL] FFMPEG is not installed or not in PATH. This is required to process browser-sent audio (webm).")
                return "ERROR: FFMPEG_MISSING"
            return ""

    def extract_roll_numbers(self, text):
        if not text:
            return []
            
        # 1. Map number words to digits
        word_to_num = {
            'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
            'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
            'ten': '10', 'eleven': '11', 'twelve': '12', 'thirteen': '13',
            'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17',
            'eighteen': '18', 'nineteen': '19', 'twenty': '20'
        }
        
        # Clean text
        text = text.lower().replace(',', ' ').replace('.', ' ')
        words = text.split()
        
        extracted = []
        for word in words:
            # Check if it's a digit
            if word.isdigit():
                extracted.append(word)
            # Check if it's a word number
            elif word in word_to_num:
                extracted.append(word_to_num[word])
        
        # Also use regex for any missed digits in strings
        import re
        digits = re.findall(r'\d+', text)
        extracted.extend(digits)
        
        result = list(set(extracted))
        print(f"[DEBUG] Extracted Roll Numbers: {result}")
        return result

# For testing
if __name__ == "__main__":
    processor = STTProcessor()
    # test_text = "Present roll number 1, 2, 5, 10 and 15"
    # print(processor.extract_roll_numbers(test_text))

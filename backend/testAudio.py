import sys
from stt_processor import STTProcessor

def test_file(filepath):
    print(f"Testing file: {filepath}")
    processor = STTProcessor()
    text = processor.process_audio(filepath)
    print(f"Result text length: {len(text)}")
    print(f"Result text: '{text}'")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_file(sys.argv[1])
    else:
        print("Provide a file path")

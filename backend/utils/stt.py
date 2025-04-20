from groq import Groq
from dotenv import load_dotenv
import tempfile
import os

load_dotenv()
groq_api_key = os.getenv("GROQ_API_KEY")


def transcribe_audio(audio_bytes: bytes) -> str:
    """
    Transcribes audio bytes using the Whisper ASR model.

    Args:
        audio_bytes (bytes): The audio data bytes (expected in webm/opus format).

    Returns:
        str: The transcribed text.
    """
    client = Groq(api_key=groq_api_key)

    
    # Save with the correct extension for whisper/ffmpeg
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
        temp_audio.write(audio_bytes) # Write the received bytes
        temp_audio_path = temp_audio.name
    
    with open(temp_audio_path, "rb") as audio_file:
        audio_byte_file = audio_file.read() 
        
    try:
        transcription = client.audio.transcriptions.create(
            file=audio_byte_file,
            model="whisper-large-v3",
            response_format="text",  
            language="en"
        )
        return transcription
    except Exception as e:
        print(f"Error during transcription: {e}")
        return ""
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)



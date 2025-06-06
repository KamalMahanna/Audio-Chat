import whisper
import tempfile

def transcribe_audio(audio_bytes: bytes) -> str: # Changed parameter name and type hint
    """
    Transcribes audio bytes using the Whisper ASR model.

    Args:
        audio_bytes (bytes): The audio data bytes (expected in webm/opus format).

    Returns:
        str: The transcribed text.
    """
    model = whisper.load_model("base.en", in_memory=True)

    # Save with the correct extension for whisper/ffmpeg
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_audio:
        temp_audio.write(audio_bytes) # Write the received bytes
        audio_file_path = temp_audio.name
        
    # Ensure the file is properly closed before passing the path to whisper
    try:
        result = model.transcribe(audio_file_path)
        the_text = result["text"]
        print(the_text)
        return the_text
    except Exception as e:
        print(f"Error during transcription: {e}") # Improved error logging
        # Optionally re-raise or return an error indicator
        return "" # Return empty string on error for now
    finally:
        # Clean up the temporary file
        import os
        if os.path.exists(audio_file_path):
            os.remove(audio_file_path)



import whisper
import tempfile

def transcribe_audio(audio_file: str) -> str:
    """
    Transcribes an audio file using the Whisper ASR model.

    Args:
        audio_file (str): The path to the audio file.

    Returns:
        str: The transcribed text.
    """
    model = whisper.load_model("base.en", in_memory=True)
    
    with tempfile.NamedTemporaryFile(suffix=".wav") as temp_audio:
        temp_audio.write(audio_file)
        audio_file_path = temp_audio.name
    
        try:
            result = model.transcribe(audio_file_path)
            the_text = result["text"]
            
            print(the_text)
            return the_text
        except Exception as e:
            print(e)


if __name__ == "__main__":

    import warnings

    warnings.filterwarnings("ignore")

    transcribed_text = transcribe_audio("../data/0.wav")
    print(transcribed_text)

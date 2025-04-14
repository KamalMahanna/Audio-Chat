import whisper


def transcribe_audio(audio_file: str) -> str:
    """
    Transcribes an audio file using the Whisper ASR model.

    Args:
        audio_file (str): The path to the audio file.

    Returns:
        str: The transcribed text.
    """
    model = whisper.load_model("base.en", in_memory=True)
    result = model.transcribe(audio_file)
    return result["text"]


if __name__ == "__main__":

    import warnings

    warnings.filterwarnings("ignore")

    transcribed_text = transcribe_audio("../data/0.wav")
    print(transcribed_text)

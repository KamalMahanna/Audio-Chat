from kokoro import KPipeline
import soundfile as sf
import io
from typing import Generator
import numpy as np 
import torch 

voice_names = {
    "default": "af_bella",
    "bella": "af_bella",
    "heart": "af_heart",
    "nicole": "af_nicole",
    "sarah": "af_sarah",
    "sky": "af_sky",
    "adam": "am_adam",
    "michael": "am_michael",
    "emma": "bf_emma",
    "isabella": "bf_isabella",
    "george": "bm_george",
    "lewis": "bm_lewis",
}

def get_audio(text: str, voice: str = "bella") -> bytes:
    """
    Converts text to audio using Kokoro's text-to-speech model.

    Args:
        text (str): The text to convert to audio.
        voice (str): The voice to use for the text-to-speech model.

    Returns:
        generator: The generated audio in wav format (PCM_16) as a generator.
    """
    voice = voice_names.get(voice, "af_bella")
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    generator = pipeline(text, voice=voice)

    audio_chunks = []
    for _, _, audio in generator:
        audio_chunks.append(audio)

    full_audio = torch.concatenate(audio_chunks)
    numpy_full_audio = full_audio.numpy()
    
    buf = io.BytesIO()
    sf.write(buf, numpy_full_audio, samplerate=24000, format='wav')
    buf.seek(0)
    
    return buf


from kokoro import KPipeline
import soundfile as sf
import io
from typing import Generator

voice_names = {'bella':'af_bella',
               'heart':'af_heart',
               'nicole':'af_nicole',
               'sarah':'af_sarah',
               'sky':'af_sky',
               'adam':'am_adam',
               'michael':'am_michael',
               'emma':'bf_emma',
               'isabella':'bf_isabella',
               'george':'bm_george',
               'lewis':'bm_lewis',
               }                

def get_audio(text: str, voice: str = "heart") -> Generator[bytes, None, None]:
    """
    Converts text to audio using Kokoro's text-to-speech model.

    Args:
        text (str): The text to convert to audio.
        voice (str): The voice to use for the text-to-speech model.

    Returns:
        generator: The generated audio in wav format as a generator.
    """
    voice = voice_names.get(voice, voice)
    
    pipeline = KPipeline(lang_code="a", repo_id="hexgrad/Kokoro-82M")
    generator = pipeline(text, voice=voice)

    for _, _, audio in generator:

        buf = io.BytesIO()
        sf.write(buf, audio, samplerate=24000, format="wav")
        yield buf.read()


if __name__ == "__main__":
    """
    Example usage of the get_audio function.
    """
    import warnings
    import time

    warnings.filterwarnings("ignore")

    from AudioUtils import play_audio

    text = """
    I know PyAudio can be used to record speech from the microphone dynamically and there a couple of real-time visualization examples of a waveform, spectrum, spectrogram, etc, but could not find anything relevant to carrying out feature extraction in a near real-time manner.
    """
    start_time = time.time()
    audio_numpy_array = get_audio(text)
    end_time = time.time()
    print(f"Time taken: {end_time - start_time} seconds")
    play_audio(audio_numpy_array)

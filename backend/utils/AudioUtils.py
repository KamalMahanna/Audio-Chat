import sounddevice as sd
import numpy as np


def play_audio(numpy_array: np.ndarray, rate: int = 24000) -> None:
    """Plays a numpy array as audio using the sounddevice library."""

    print("Playing audio...")
    sd.play(numpy_array, samplerate=rate)
    sd.wait()
    print("Done!")


def record_audio(duration: int = 5) -> np.ndarray:
    """
    Records audio for a specified duration using the sounddevice library.

    Args:
        duration (int): The duration in seconds to record audio.

    Returns:
        numpy.ndarray: The recorded audio as a numpy array.
    """
    print("Recording audio...")
    audio = sd.rec(int(duration * 24000), samplerate=24000, channels=1)
    sd.wait()
    print("Done!")
    return audio

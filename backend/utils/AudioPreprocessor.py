import librosa
import numpy as np
import noisereduce as nr


class AudioPreprocessor:
    """
    A utility class for preprocessing audio files.

    It provides methods to load an audio file, reduce noise,
    remove silence, and normalize the audio signal.
    """

    def __init__(self, audio_path: str):
        """
        Initialize the AudioPreprocessor with the given audio path.

        Args:
            audio_path (str): The file path to the audio file.
        """
        self.audio_path = audio_path
        self.audio, self.sr = librosa.load(self.audio_path, sr=16000)

    def remove_noise(self) -> np.ndarray:
        """
        Reduce noise in the loaded audio signal.

        Returns:
            np.ndarray: The noise-reduced audio signal.
        """
        reduced_noise = nr.reduce_noise(y=self.audio, sr=self.sr)
        return reduced_noise

    def remove_silence(self) -> np.ndarray:
        """
        Trim silence from the beginning and end of the audio signal.

        Returns:
            np.ndarray: The trimmed audio signal.
        """
        trimmed_audio, _ = librosa.effects.trim(self.audio)
        return trimmed_audio

    def normalize_audio(self) -> np.ndarray:
        """
        Normalize the amplitude of the audio signal.

        Returns:
            np.ndarray: The normalized audio signal.
        """
        normalized = librosa.util.normalize(self.audio)
        return normalized

    def preprocess_audio(self) -> np.ndarray:
        """
        Perform the full preprocessing pipeline on the audio.
        This includes noise reduction, silence removal, and normalization.

        Returns:
            np.ndarray: The fully preprocessed audio signal.
        """
        self.audio = self.remove_noise()
        self.audio = self.remove_silence()
        self.audio = self.normalize_audio()
        return self.audio

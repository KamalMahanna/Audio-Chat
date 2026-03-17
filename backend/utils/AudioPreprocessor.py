import librosa
import noisereduce as nr
import soundfile as sf
import numpy as np


class AudioPreprocessor:
    def __init__(self, audio_path: str):
        self.audio_path = audio_path
        self.audio, self.sr = librosa.load(self.audio_path, sr=16000)

    def remove_noise(self):
        reduced_noise = nr.reduce_noise(y=self.audio, sr=self.sr)
        return reduced_noise

    def remove_silence(self):
        trimmed_audio, _ = librosa.effects.trim(self.audio)
        return trimmed_audio

    def normalize_audio(self):
        normalized = librosa.util.normalize(self.audio)
        return normalized

    def preprocess_audio(self):
        self.audio = self.remove_noise()
        self.audio = self.remove_silence()
        self.audio = self.normalize_audio()
        return self.audio

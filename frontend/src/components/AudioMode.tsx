import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useStore } from '../store';

export const AudioMode: React.FC = () => {
  const { isRecording, setIsRecording, selectedVoice } = useStore();
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#10b981',
        progressColor: '#047857',
        cursorColor: 'transparent',
        height: 200,
        normalize: true,
        barWidth: 3,
        barGap: 3,
        barRadius: 3,
      });
    }

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob);
        
        try {
          const response = await fetch(`/audio/session-id/model/${selectedVoice}`, {
            method: 'POST',
            body: formData,
          });
          
          if (response.body) {
            const reader = response.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const audioBlob = new Blob([value], { type: 'audio/wav' });
              const audioUrl = URL.createObjectURL(audioBlob);
              wavesurferRef.current?.load(audioUrl);
            }
          }
        } catch (error) {
          console.error('Error sending audio:', error);
        }
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    audioStream?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    setMediaRecorder(null);
    setAudioStream(null);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl bg-surface-light dark:bg-surface-dark rounded-2xl shadow-glass p-8 backdrop-blur-glass"
      >
        <div ref={containerRef} className="w-full" />
      </motion.div>
      
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-6 rounded-full shadow-xl transition-all duration-300 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-primary-light dark:bg-primary-dark hover:opacity-90'
        } text-white`}
      >
        {isRecording ? <Square size={32} /> : <Mic size={32} />}
      </motion.button>

      {isRecording && (
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="w-6 h-6 bg-red-500 rounded-full shadow-lg"
        />
      )}
    </div>
  );
};
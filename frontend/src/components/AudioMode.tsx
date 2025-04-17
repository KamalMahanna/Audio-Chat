import React, { useRef, useState, useEffect, useCallback } from 'react'; // Added useCallback
import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { ChatSession } from '../types'; // Import ChatSession type

export const AudioMode: React.FC = () => {
  const {
    isRecording,
    setIsRecording,
    selectedVoice,
    currentSession, // Corrected: Renamed from sessionId to match store
    modelName,
    sessions,
    setSessions,
    setCurrentSession
  } = useStore();
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State for managing playback
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const currentAudioUrlRef = useRef<string | null>(null); // To store the current blob URL for cleanup

  useEffect(() => {
    const audioEl = audioPlaybackRef.current;
    if (audioEl) {
      // Handle playback end
      const handleAudioEnd = () => {
        console.log("Audio ended:", audioEl.currentSrc);
        setIsAudioPlaying(false);
        // Clean up the blob URL slightly delayed
        const urlToRevoke = currentAudioUrlRef.current; // Capture the URL
        if (urlToRevoke) {
          setTimeout(() => {
              try {
                URL.revokeObjectURL(urlToRevoke);
                console.log("Revoked URL (delayed) on ended:", urlToRevoke);
                // Only nullify if it hasn't been replaced by a new URL in the meantime
                if (currentAudioUrlRef.current === urlToRevoke) {
                   currentAudioUrlRef.current = null;
                }
              } catch (e) {
                  console.error("Error revoking URL (delayed):", urlToRevoke, e);
              }
          }, 100); // Delay revocation by 100ms
          // Note: Don't nullify currentAudioUrlRef.current immediately here
        }
      };
      audioEl.addEventListener('ended', handleAudioEnd);

      // Handle errors - Only log, don't change state or revoke URL here,
      // as errors might be triggered by external scripts (hook.js) after normal completion/revocation.
      // The 'ended' handler is responsible for cleanup.
      const handleAudioError = (e: Event) => {
        // Check if the error source still exists before logging potentially confusing messages
        if (audioEl && audioEl.currentSrc) {
            console.error("Audio element error event:", e, "Src:", audioEl.currentSrc);
        } else {
            console.warn("Audio element error event occurred, but element or src is already null/empty:", e);
        }
        // --- REMOVED ---
        // setIsAudioPlaying(false);
        // if (currentAudioUrlRef.current) {
        //   URL.revokeObjectURL(currentAudioUrlRef.current);
        //   console.log("Revoked URL on audio error:", currentAudioUrlRef.current);
        //   currentAudioUrlRef.current = null;
        // }
        // --- END REMOVED ---
      };
      audioEl.addEventListener('error', handleAudioError);

      // Add listener for canplay (useful for debugging)
      const handleCanPlay = () => {
          console.log("Audio can play:", audioEl.src);
      };
      audioEl.addEventListener('canplay', handleCanPlay);

      // Add listener for loadeddata
      const handleLoadedData = () => {
            console.log("Audio loadeddata:", audioEl.src);
      };
      audioEl.addEventListener('loadeddata', handleLoadedData);


      return () => {
        audioEl.removeEventListener('ended', handleAudioEnd);
        audioEl.removeEventListener('error', handleAudioError);
        audioEl.removeEventListener('canplay', handleCanPlay);
        audioEl.removeEventListener('loadeddata', handleLoadedData);

        // Clean up the current URL if component unmounts while playing
        if (currentAudioUrlRef.current) {
            console.log("Cleaning up audio URL on unmount.");
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }
      };
    } else {
        console.log("Audio element ref is null in event listener setup effect.");
    }
  }, []); // Run only once on mount

  // Cleanup audio URL on component unmount if needed
  useEffect(() => {
      return () => {
          if (currentAudioUrlRef.current) {
              console.log("Revoking audio URL on component unmount:", currentAudioUrlRef.current);
              URL.revokeObjectURL(currentAudioUrlRef.current);
              currentAudioUrlRef.current = null;
          }
      };
  }, []);


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

      // Sync WaveSurfer with audio element playback
       if (audioPlaybackRef.current) {
           const audioEl = audioPlaybackRef.current;
           const ws = wavesurferRef.current;

           // Load waveform when audio source changes and can play
           const handleCanPlayWs = () => { // Renamed to avoid conflict
               // Load waveform only when a valid blob src is set and audio can play
               if (audioEl.src && audioEl.src.startsWith('blob:') && currentAudioUrlRef.current === audioEl.src) {
                    console.log("WaveSurfer: Loading waveform for:", audioEl.src);
                    ws?.load(audioEl.src).catch(e => console.error("WaveSurfer load error:", e));
               } else if (ws?.getActivePlugins()?.[0]) { // Basic check if wavesurfer is ready
                    // Don't clear immediately on src change, wait for new load or end
                    // console.log("WaveSurfer: Source changed or invalid, potentially emptying.");
                    // ws?.empty();
               }
           };
           // Use 'loadedmetadata' instead of 'canplay' for more reliable loading trigger
           audioEl.addEventListener('loadedmetadata', handleCanPlayWs);

           // Update WaveSurfer progress during playback
           const handleTimeUpdateWs = () => { // Renamed
               // Corrected: Removed ws?.isReady check
               if (audioEl.duration && ws?.getActivePlugins()?.[0]) { // Basic check if wavesurfer is ready
                   ws.seekTo(audioEl.currentTime / audioEl.duration);
               }
           };
           audioEl.addEventListener('timeupdate', handleTimeUpdateWs);

           // Clear WaveSurfer when playback ends or errors
           const handleEndedOrErrorWs = () => {
              if(ws?.getActivePlugins()?.[0]){ // Basic check if wavesurfer is ready
                console.log("WaveSurfer: Emptying waveform on end/error.");
                ws?.empty();
              }
           };
           audioEl.addEventListener('ended', handleEndedOrErrorWs);
           audioEl.addEventListener('error', handleEndedOrErrorWs); // Also clear on error


           return () => {
               audioEl.removeEventListener('loadedmetadata', handleCanPlayWs);
               audioEl.removeEventListener('timeupdate', handleTimeUpdateWs);
               audioEl.removeEventListener('ended', handleEndedOrErrorWs);
               audioEl.removeEventListener('error', handleEndedOrErrorWs);
           };
       } else {
         console.log("Audio element ref is null for WaveSurfer setup.");
       }
    }

    return () => {
      console.log("Destroying WaveSurfer.");
      wavesurferRef.current?.destroy();
    };
  }, []); // Run only once

  const startRecording = async () => {
    // Corrected: Use currentSession from store
    let targetSessionId = currentSession;

    if (!targetSessionId) {
      targetSessionId = uuidv4();
      const newSession: ChatSession = {
        SessionId: targetSessionId,
        chat_name: 'New Audio Session'
      };
      setSessions([newSession, ...useStore.getState().sessions]);
      setCurrentSession(targetSessionId);
      console.log('Created and set new audio session:', targetSessionId);
    }

    // Clean up previous audio if any and reset state
    if (currentAudioUrlRef.current) {
      console.log("Revoking previous audio URL before new recording:", currentAudioUrlRef.current);
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    if (audioPlaybackRef.current) {
        audioPlaybackRef.current.src = ''; // Clear src
    }
    setIsAudioPlaying(false); // Ensure playing state is reset
    wavesurferRef.current?.empty(); // Clear old waveform

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          console.log(`Sending audio to session: ${targetSessionId} using model: ${modelName} with voice: ${selectedVoice}`);
          const response = await fetch(`http://127.0.0.1:8000/audio/${targetSessionId}/${modelName}/${selectedVoice}`, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Check for audio content type
          if (response.headers.get('Content-Type')?.includes('audio')) {
            console.log("Received audio response. Processing as single blob.");
            const audioBlob = await response.blob(); // Read entire response as blob
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log("Created blob URL:", audioUrl);

            // Clean up previous URL if exists (safety check)
             if (currentAudioUrlRef.current) {
               URL.revokeObjectURL(currentAudioUrlRef.current);
               console.log("Revoked existing URL before playing new one:", currentAudioUrlRef.current);
             }
            currentAudioUrlRef.current = audioUrl; // Store the new URL

            if (audioPlaybackRef.current) {
              const audioEl = audioPlaybackRef.current;
              audioEl.src = audioUrl;
              audioEl.load(); // Important: Load the new source

              const playPromise = audioEl.play();
              if (playPromise !== undefined) {
                 setIsAudioPlaying(true); // Set playing state
                 playPromise.then(() => {
                    console.log("Playback started for:", audioUrl);
                 }).catch(e => {
                    console.error("Playback promise rejected for URL:", audioUrl, e);
                    setIsAudioPlaying(false); // Reset state on playback error
                    // Error handler will revoke URL
                 });
              } else {
                 console.warn("audioEl.play() did not return a promise.");
                 setIsAudioPlaying(false);
              }
            } else {
               console.error("Audio playback element not found.");
               setIsAudioPlaying(false);
               // Revoke URL immediately if playback element is missing
               URL.revokeObjectURL(audioUrl);
               currentAudioUrlRef.current = null;
            }
          } else {
               console.warn("Response was not audio. Content-Type:", response.headers.get('Content-Type'));
               const errorText = await response.text();
               console.error("Non-audio response body:", errorText);
               setIsAudioPlaying(false); // Reset playing state if response is not audio
          }
        } catch (error) {
          console.error('Error sending audio or processing response:', error);
           setIsAudioPlaying(false); // Also reset playing state on fetch/processing error
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
       setIsAudioPlaying(false); // Reset playing state if mic access fails
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
        <div ref={containerRef} className="w-full h-[200px]" />
        <audio ref={audioPlaybackRef} className="hidden" /> {/* Playback element */}
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isAudioPlaying} // Disable button when audio is playing
        className={`p-6 rounded-full shadow-xl transition-all duration-300 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600' // Style for recording (stop) state
            : isAudioPlaying
              ? 'bg-gray-500 cursor-not-allowed' // Style for playing audio (disabled)
              : 'bg-primary-light dark:bg-primary-dark hover:opacity-90' // Style for ready (start) state
        } text-white opacity-80 disabled:opacity-50`} // General disabled style
      >
        {isRecording ? <Square size={32} /> : <Mic size={32} />}
      </motion.button>

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-6 bg-red-500 rounded-full shadow-lg"
        />
      )}
      {/* Audio Playing indicator */}
      {isAudioPlaying && !isRecording && (
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.5, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="w-4 h-4 bg-green-500 rounded-full shadow-md"
                title="Playing response" // Add title for clarity
            />
        )}
    </div>
  );
};
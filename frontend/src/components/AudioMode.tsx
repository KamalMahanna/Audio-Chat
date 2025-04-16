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

  // State for managing chunked playback
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const isPlayingRef = useRef(false); // Ref to track playing state reliably in callbacks

  // Ref for audio element to use in error handling
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    audioElRef.current = audioPlaybackRef.current;
  }, [audioPlaybackRef.current]); // Update ref when audioPlaybackRef changes

  useEffect(() => {
    isPlayingRef.current = isPlayingResponse;
  }, [isPlayingResponse]);


  // Function to play the next audio chunk from the queue
  const playNextChunk = useCallback(() => {
    // Check if queue has items, audio ref exists, and not currently playing
    if (audioQueue.length > 0 && audioPlaybackRef.current && !isPlayingRef.current) {
      const audioEl = audioPlaybackRef.current; // Get reference
      const nextUrl = audioQueue[0]; // Get URL
      setAudioQueue(prev => prev.slice(1)); // Remove URL from state queue immediately

      console.log(`Attempting to play chunk: ${nextUrl}`); // Log attempt
      console.log(`Audio state before play: paused=${audioEl.paused}, muted=${audioEl.muted}, volume=${audioEl.volume}, src=${audioEl.src}`);

      setIsPlayingResponse(true); // Set playing state
      audioEl.src = nextUrl; // Set src
      audioEl.load(); // Load new src

      // Explicitly set volume in case it was somehow changed
      audioEl.volume = 1.0;
      audioEl.muted = false;

      const playPromise = audioEl.play(); // Attempt play

      if (playPromise !== undefined) {
          playPromise.then(() => {
             console.log("Playback started successfully for:", nextUrl); // Add success log
          }).catch(e => { // Catch errors
              console.error("Playback promise rejected for URL:", nextUrl, e);
              setIsPlayingResponse(false); // Reset state on error
              // Try playing next chunk after an error
               if (audioElRef.current?.currentSrc && audioElRef.current.currentSrc.startsWith('blob:')) { // Check if src exists before revoking
                   URL.revokeObjectURL(audioElRef.current.currentSrc); // Revoke failed URL
                   console.log("Revoked URL on playback error:", audioElRef.current.currentSrc);
               }
               playNextChunkRef.current(); // Try playing next after error
           });
      } else {
          console.warn("audioEl.play() did not return a promise. Playback might not be initiated.");
           // If play doesn't return a promise, it might have failed synchronously or be in a state where it can't play.
           // We might need to rely on events like 'error' or 'stalled'.
           setIsPlayingResponse(false); // Reset playing state as a precaution
      }

    } else {
        console.log("Conditions not met for playNextChunk:");
        if (audioQueue.length === 0) console.log("- Audio queue empty.");
        if (!audioPlaybackRef.current) console.log("- Audio element ref is null.");
        if (isPlayingRef.current) console.log("- Another chunk is already playing.");
    }
  }, [audioQueue]); // Dependency on audioQueue

  // Ref to keep playNextChunk stable in callbacks
  const playNextChunkRef = useRef(playNextChunk);
  useEffect(() => {
      playNextChunkRef.current = playNextChunk;
  }, [playNextChunk]);

  // Effect to trigger playback when queue is updated and not playing
  useEffect(() => {
    // console.log(`Queue changed (length: ${audioQueue.length}), isPlaying: ${isPlayingResponse}`); // Reduced verbosity
    if (!isPlayingResponse && audioQueue.length > 0) {
      console.log("Triggering playNextChunk from useEffect");
      playNextChunkRef.current();
    }
  }, [audioQueue, isPlayingResponse]); // Depend on queue and playing state

  useEffect(() => {
    const audioEl = audioPlaybackRef.current;
    if (audioEl) {
      const handleAudioEnd = () => {
        console.log("Chunk ended:", audioEl.currentSrc);
        setIsPlayingResponse(false); // Set playing state to false
        // Clean up the ended blob URL
        if (audioEl.currentSrc && audioEl.currentSrc.startsWith('blob:')) {
            URL.revokeObjectURL(audioEl.currentSrc);
            console.log("Revoked URL on ended:", audioEl.currentSrc);
        }
      };
      audioEl.addEventListener('ended', handleAudioEnd);

      // Handle errors
      const handleAudioError = (e: Event) => {
          console.error("Audio element error event:", e, "Src:", audioEl.currentSrc);
          setIsPlayingResponse(false);
          // Clean up potentially broken blob URL
          if (audioEl.currentSrc && audioEl.currentSrc.startsWith('blob:')) {
              URL.revokeObjectURL(audioEl.currentSrc);
              console.log("Revoked URL on audio element error:", audioEl.currentSrc);
          }
      }
      audioEl.addEventListener('error', handleAudioError);

      // Add listener for canplay
      const handleCanPlay = () => {
          console.log("Audio can play:", audioEl.src);
      };
      audioEl.addEventListener('canplay', handleCanPlay);

      // Add listener for loadeddata
      const handleLoadedData = () => {
            console.log("Audio loadeddata:", audioEl.src);
            // You could potentially try playing here again if initial play failed, but be careful of loops
      };
      audioEl.addEventListener('loadeddata', handleLoadedData);


      return () => {
        audioEl.removeEventListener('ended', handleAudioEnd);
        audioEl.removeEventListener('error', handleAudioError);
        audioEl.removeEventListener('canplay', handleCanPlay); // Cleanup canplay listener
        audioEl.removeEventListener('loadeddata', handleLoadedData); // Cleanup loadeddata listener

        // Clean up any remaining URLs in the queue on component unmount
        console.log("Cleaning up audio queue on unmount.");
        setAudioQueue(currentQueue => {
            currentQueue.forEach(url => URL.revokeObjectURL(url));
            return [];
        });
      };
    } else {
        console.log("Audio element ref is null in event listener setup effect.");
    }
  }, []); // Run only once on mount

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
               if (audioEl.src && audioEl.src.startsWith('blob:')) {
                    console.log("WaveSurfer: Loading waveform for:", audioEl.src);
                    ws?.load(audioEl.src).catch(e => console.error("WaveSurfer load error:", e));
               } else {
                   if(ws?.getActivePlugins()?.[0]) { // Basic check if wavesurfer is ready
                     console.log("WaveSurfer: Emptying waveform.");
                     ws?.empty(); // Clear waveform if no valid source
                   }
               }
           };
           audioEl.addEventListener('canplay', handleCanPlayWs);

           // Update WaveSurfer progress during playback
           const handleTimeUpdateWs = () => { // Renamed
               // Corrected: Removed ws?.isReady check
               if (audioEl.duration && ws?.getActivePlugins()?.[0]) { // Basic check if wavesurfer is ready
                   ws.seekTo(audioEl.currentTime / audioEl.duration);
               }
           };
           audioEl.addEventListener('timeupdate', handleTimeUpdateWs);

           // Reset WaveSurfer when playback ends
           const handleEndedWs = () => { // Renamed
              if(ws?.getActivePlugins()?.[0]){
                console.log("WaveSurfer: Emptying waveform on end.");
                ws?.empty(); // Option 2: Clear waveform (might be better for chunks)
              }
           };
           audioEl.addEventListener('ended', handleEndedWs);


           return () => {
               audioEl.removeEventListener('canplay', handleCanPlayWs);
               audioEl.removeEventListener('timeupdate', handleTimeUpdateWs);
               audioEl.removeEventListener('ended', handleEndedWs);
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

    // Reset audio queue and state before starting
    console.log("Resetting audio queue and state for new recording.");
    setAudioQueue(currentQueue => {
        currentQueue.forEach(url => URL.revokeObjectURL(url)); // Clean up old URLs
        return [];
    });
    setIsPlayingResponse(false); // Ensure playing state is reset
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

          if (response.body && response.headers.get('Content-Type')?.includes('audio/wav')) {
            const reader = response.body.getReader();

            // Function to process stream
            const processStream = async () => {
              let chunkIndex = 0; // Add index for logging
              while (true) {
                try {
                    console.log(`[Stream Loop ${chunkIndex}]: Calling reader.read()...`); // Log read attempt
                    const { done, value } = await reader.read();
                    console.log(`[Stream Loop ${chunkIndex}]: reader.read() returned: done=${done}, value size=${value?.byteLength ?? 'undefined'}`); // Log result

                    if (done) {
                      console.log("[Stream Loop]: Stream finished (done is true).");
                      // Final check to reset playing state if queue becomes empty and nothing ended up playing
                       if (!isPlayingRef.current && audioQueue.length === 0) {
                          setIsPlayingResponse(false);
                       }
                      break;
                    }

                    if (value) { // Check if value exists
                      // We assume each 'value' is a complete WAV chunk from the backend
                      const chunkBlob = new Blob([value], { type: 'audio/wav' });
                      const chunkUrl = URL.createObjectURL(chunkBlob);
                      console.log(`[Stream Loop ${chunkIndex}]: Received chunk, adding URL to queue: ${chunkUrl}`);

                      // Add to queue. Playback is triggered by the useEffect hook.
                      setAudioQueue(prev => [...prev, chunkUrl]);
                    } else {
                       console.log(`[Stream Loop ${chunkIndex}]: Received no value, but not done yet.`); // Log if value is undefined but not done
                    }

                    chunkIndex++; // Increment index

                } catch (error) {
                    console.error(`[Stream Loop ${chunkIndex}]: Error reading stream:`, error);
                     setIsPlayingResponse(false); // Reset playing state on stream error
                    break;
                }
              }
            };

            processStream(); // Start processing the stream

          } else {
               console.warn("Response body missing or incorrect Content-Type:", response.headers.get('Content-Type'));
                setIsPlayingResponse(false); // Reset playing state if response is invalid
          }
        } catch (error) {
          console.error('Error sending audio or processing response:', error);
           setIsPlayingResponse(false); // Also reset playing state on fetch/processing error
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
       setIsPlayingResponse(false); // Reset playing state if mic access fails
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
        disabled={isPlayingResponse} // Corrected: Only disable when playing response
        className={`p-6 rounded-full shadow-xl transition-all duration-300 ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600' // Style for recording (stop) state
            : isPlayingResponse
              ? 'bg-gray-500 cursor-not-allowed' // Style for playing response (disabled)
              : 'bg-primary-light dark:bg-primary-dark hover:opacity-90' // Style for ready (start) state
        } text-white opacity-80 disabled:opacity-50`} // General disabled style (now applies only when playing)
      >
        {isRecording ? <Square size={32} /> : <Mic size={32} />}
      </motion.button>

      {isRecording && (
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-6 h-6 bg-red-500 rounded-full shadow-lg"
        />
      )}
       {isPlayingResponse && !isRecording && ( // Show indicator only when playing and not recording
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.5, 0.8] }}
                transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                className="w-4 h-4 bg-green-500 rounded-full shadow-md"
            />
        )}
    </div>
  );
};
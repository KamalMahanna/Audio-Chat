import React, { useRef, useState, useEffect, useCallback } from 'react'; // Added useCallback
import { motion } from 'framer-motion';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react'; // Import new icons
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid'; // Import uuid
import { ChatSession } from '../types'; // Import ChatSession type

export const AudioMode: React.FC = () => {
  // --- HINT STATE ---
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem('audio_hint_shown');
      if (!seen) {
        setShowHint(true);
      }
    }
  }, []);
  // --- END HINT STATE ---
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
  // Remove wavesurferRef and containerRef

  // State for managing playback and loading
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // New state for loading indicator
  // Remove showWaveform state
  const currentAudioUrlRef = useRef<string | null>(null); // To store the current blob URL for cleanup

  useEffect(() => {
    const audioEl = audioPlaybackRef.current;
    if (audioEl) {
      // Handle playback end
      const handleAudioEnd = () => {
        console.log("Audio ended:", audioEl.currentSrc);
        setIsAudioPlaying(false);
        // Don't reset isLoading here, it's handled after fetch/playback attempt
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
        // Reset loading state on audio error
        setIsLoading(false);
        // --- REMOVED ---
        // setIsAudioPlaying(false); // Already handled by 'ended' or playback promise rejection
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
    setIsLoading(false); // Reset loading state

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);

      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        setIsLoading(true); // Start loading indicator
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        const formData = new FormData();
        formData.append('audio', blob, 'recording.webm');

        try {
          console.log(`Sending audio to session: ${targetSessionId} using model: ${modelName} with voice: ${selectedVoice}`);
          const response = await fetch(`http://localhost:8000/audio/${targetSessionId}/${modelName}/${selectedVoice}`, {
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
                 setIsLoading(false); // Stop loading indicator *before* playback starts (or immediately after)
                 playPromise.then(() => {
                    console.log("Playback started for:", audioUrl);
                    // No need to set loading false here again
                 }).catch(e => {
                    console.error("Playback promise rejected for URL:", audioUrl, e);
                    setIsAudioPlaying(false); // Reset state on playback error
                    setIsLoading(false); // Ensure loading indicator stops on playback error
                    // Error handler might revoke URL, or the 'ended' event will
                 });
              } else {
                 console.warn("audioEl.play() did not return a promise.");
                 setIsAudioPlaying(false);
                 setIsLoading(false); // Stop loading indicator if play() doesn't return promise
               }
             } else {
                console.error("Audio playback element not found.");
                setIsAudioPlaying(false);
                setIsLoading(false); // Stop loading indicator if element not found
                // Revoke URL immediately if playback element is missing
                if (audioUrl) URL.revokeObjectURL(audioUrl); // Check if audioUrl exists before revoking
                currentAudioUrlRef.current = null;
            }
          } else {
               console.warn("Response was not audio. Content-Type:", response.headers.get('Content-Type'));
               const errorText = await response.text();
               console.error("Non-audio response body:", errorText);
               setIsAudioPlaying(false); // Reset playing state if response is not audio
               setIsLoading(false); // Stop loading indicator on non-audio response
          }
        } catch (error) {
          console.error('Error sending audio or processing response:', error);
           setIsAudioPlaying(false); // Also reset playing state on fetch/processing error
           setIsLoading(false); // Stop loading indicator on fetch/processing error
        }
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
       setIsAudioPlaying(false); // Reset playing state if mic access fails
       setIsLoading(false); // Reset loading state if mic access fails
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
    // Remove the outer motion.div for the waveform container
    // Keep the audio element
    // Adjust main div styling if needed (removing space-y-12)
    <div className="flex flex-col items-center justify-center h-full p-8">
       <audio ref={audioPlaybackRef} className="hidden" /> {/* Playback element moved here */}

      <motion.button
        whileHover={!(isRecording || isAudioPlaying) ? { scale: 1.05 } : {}} // Disable hover effect during animation
        whileTap={!(isRecording || isAudioPlaying) ? { scale: 0.95 } : {}} // Disable tap effect during animation
        animate={isRecording || isAudioPlaying ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : {}}
        transition={isRecording || isAudioPlaying ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
        onClick={e => {
          if (showHint) {
            setShowHint(false);
            localStorage.setItem('audio_hint_shown', '1');
          }
          if (isRecording) stopRecording();
          else startRecording();
        }}
        disabled={isLoading || isAudioPlaying} // Disable button when loading OR playing audio
        className={`p-6 rounded-full shadow-xl transition-colors duration-300 ${ // Keep color transition smooth
          isRecording
            ? 'bg-red-500 hover:bg-red-600' // Style for recording (stop) state
            : isLoading || isAudioPlaying
              ? 'bg-gray-500 cursor-not-allowed' // Style for loading or playing audio (disabled)
              : 'bg-primary-light dark:bg-primary-dark hover:opacity-90' // Style for ready (start) state
        } text-white opacity-80 disabled:opacity-50`} // General disabled style
      >
        {isRecording ? (
          <Square size={32} />
        ) : isLoading ? (
          <Loader2 size={32} className="animate-spin" /> // Loading icon
        ) : isAudioPlaying ? (
          <Volume2 size={32} /> // Speaker icon
        ) : (
          <Mic size={32} /> // Default Mic icon
        )}
      </motion.button>

      {/* Show hint only until mic is clicked for the first time */}
      {showHint && (
        <div className="flex flex-col items-center mt-4">
          <div className="bg-background-light dark:bg-background-dark rounded px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-200 max-w-xs border border-gray-200 dark:border-gray-700">
            Tap the mic to ask your question, and tap again when you're done asking. We'll handle the rest!
          </div>
        </div>
      )}

      {/* Remove recording and playing indicators (lines 284-300) */}

    </div>
  );
};
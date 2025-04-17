import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit, Mic, MessageSquare, Check, X, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react'; // Added Pause
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { useEffect, useRef } from 'react'; // Added useEffect, useRef

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    sessions,
    currentSession,
    mode,
    modelName, // Import global modelName
    setSessions,
    setCurrentSession,
    fetchChatHistory,
    setMode,
    setModelName,
    selectedVoice,    // Added selectedVoice
    setSelectedVoice, // Added setSelectedVoice
  } = useStore();

  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  // Remove local modelName state, use global from store
  const [isEditingModel, setIsEditingModel] = useState(false);
  // Initialize tempModelName with global modelName when editing starts
  const [tempModelName, setTempModelName] = useState('');

  // --- Voice Selection State & Logic ---
  const availableVoices = [
    'adam', 'bella', 'emma', 'george', 'heart',
    'isabella', 'lewis', 'michael', 'nicole', 'sarah', 'sky'
  ];
  const [currentVoiceIndex, setCurrentVoiceIndex] = useState(
    availableVoices.indexOf(selectedVoice) >= 0 ? availableVoices.indexOf(selectedVoice) : availableVoices.indexOf('bella')
  );
  const audioRef = useRef<HTMLAudioElement | null>(null); // Ref to hold the single audio element
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState<string | null>(null); // Track the URL being played

  // Setup event listeners for the single audio element
  useEffect(() => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    const handlePlay = () => setIsVoicePlaying(true);
    const handlePause = () => setIsVoicePlaying(false);
    const handleEnded = () => setIsVoicePlaying(false);
    const handleError = (e: Event) => {
      console.error("Audio element error (Sidebar):", e, "Src:", audioEl.src);
      setIsVoicePlaying(false);
      setCurrentVoiceUrl(null); // Reset URL on error
    };

    audioEl.addEventListener('play', handlePlay);
    audioEl.addEventListener('pause', handlePause);
    audioEl.addEventListener('ended', handleEnded);
    audioEl.addEventListener('error', handleError);

    // Cleanup listeners on unmount or element change (though it shouldn't change now)
    return () => {
      audioEl.removeEventListener('play', handlePlay);
      audioEl.removeEventListener('pause', handlePause);
      audioEl.removeEventListener('ended', handleEnded);
      audioEl.removeEventListener('error', handleError);
      // Pause audio on unmount
      audioEl.pause();
    };
  }, []); // Run only once when the audio element is potentially mounted

  const playVoice = (voiceName: string) => {
    const voiceAudioUrl = `/voices/${voiceName}.wav`;
    const audioEl = audioRef.current;

    if (!audioEl) {
        console.error("Sidebar audio element ref is not available.");
        return;
    }

    // If clicking the button for the currently loaded and playing voice, pause it.
    if (currentVoiceUrl === voiceAudioUrl && isVoicePlaying) {
      audioEl.pause();
    }
    // If clicking the button for the currently loaded but paused voice, play it.
    else if (currentVoiceUrl === voiceAudioUrl && !isVoicePlaying) {
      audioEl.play().catch(error => {
        console.error("Audio play failed (re-play):", error);
        setIsVoicePlaying(false); // Ensure state is false if play promise rejects
      });
    }
    // Otherwise, load and play the new voice
    else {
      audioEl.src = voiceAudioUrl;
      setCurrentVoiceUrl(voiceAudioUrl); // Track the new URL
      audioEl.load(); // Load the new source
      audioEl.play().catch(error => {
        console.error("Audio play failed (new load):", error);
        setIsVoicePlaying(false); // Ensure state is false if play promise rejects
        setCurrentVoiceUrl(null); // Reset URL on error
      });
    }
  };

  const handleSelectVoice = () => { // Removed voiceName argument
    setSelectedVoice(availableVoices[currentVoiceIndex]); // Use current index
    // Optionally play sound on selection
    // playVoice(availableVoices[currentVoiceIndex]);
  };

  const handleNextVoice = () => {
    const nextIndex = (currentVoiceIndex + 1) % availableVoices.length;
    setCurrentVoiceIndex(nextIndex);
    playVoice(availableVoices[nextIndex]); // Auto-play next voice
  };

  const handlePrevVoice = () => {
    const prevIndex = (currentVoiceIndex - 1 + availableVoices.length) % availableVoices.length;
    setCurrentVoiceIndex(prevIndex);
    playVoice(availableVoices[prevIndex]); // Auto-play previous voice
  };

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // --- End Voice Selection State & Logic ---

  const createNewChat = () => {
    const newSession = {
      SessionId: uuidv4(),
      chat_name: 'New Chat'
    };
    setSessions([newSession, ...sessions]); // Prepend new session
    setCurrentSession(newSession.SessionId);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`http://localhost:8000/delete_session/${sessionId}`, { method: 'DELETE' }); // Use full backend URL and method
      setSessions(sessions.filter(s => s.SessionId !== sessionId));
      if (currentSession === sessionId) {
        setCurrentSession(null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const startEditing = (sessionId: string, currentName: string) => {
    setEditingSession(sessionId);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingSession(null);
    setEditingName('');
  };

  const renameChat = async (sessionId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await fetch(`http://localhost:8000/update_chat_name/${sessionId}/${encodeURIComponent(newName)}`, { method: 'PATCH' }); // Use full backend URL and method
      setSessions(sessions.map(s => 
        s.SessionId === sessionId ? { ...s, chat_name: newName } : s
      ));
      setEditingSession(null);
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  const startEditingModel = () => {
    setTempModelName(modelName); // Initialize with global modelName
    setIsEditingModel(true);
  };

  const cancelEditingModel = () => {
    setIsEditingModel(false);
    // No need to reset tempModelName here explicitly, it's set on edit start
  };

  const saveModelName = () => {
    if (!tempModelName.trim()) return; // Prevent empty names
    setModelName(tempModelName); // Call global setModelName from store
    setIsEditingModel(false);
    console.log("Global model name updated to:", tempModelName);
  };

  // Prepare the list of session elements outside the main return
  const sessionListItems = sessions.map((session) => (
    <motion.div
      key={session.SessionId} // Key is definitely here
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 ${
        currentSession === session.SessionId
          ? 'bg-primary-light/10 dark:bg-primary-dark/10 shadow-lg'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
      onClick={() => {
        if (editingSession !== session.SessionId) {
          setCurrentSession(session.SessionId);
          fetchChatHistory(session.SessionId); // Fetch history on click
        }
      }}
    >
      <div className="flex items-center justify-between">
        {editingSession === session.SessionId ? (
          <div className="flex items-center space-x-1 w-full"> {/* Adjusted: Removed flex-1, added w-full, adjusted spacing */}
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  renameChat(session.SessionId, editingName);
                }
              }}
              className="flex-grow min-w-0 px-2 py-1 rounded-full bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
              autoFocus
            />
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => renameChat(session.SessionId, editingName)} className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"> <Check size={16} /> </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={cancelEditing} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"> <X size={16} /> </motion.button>
          </div>
        ) : (
          <>
            <span className="truncate font-medium">{session.chat_name}</span>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); startEditing(session.SessionId, session.chat_name); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"> <Edit size={16} /> </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); deleteSession(session.SessionId); }} className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"> <Trash2 size={16} /> </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  ));

  return (
    <>
      {isOpen && (
        <motion.div
          key="sidebar-motion-wrapper" // Add a static key here
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }} // Changed from spring to tween
          className="absolute top-4 bottom-4 left-4 w-72 flex flex-col bg-surface-light dark:bg-surface-dark backdrop-blur-glass shadow-glass dark:shadow-glass-dark z-50 p-6 rounded-lg" // Changed h-[85vh] to bottom-4
        >
          <div className="flex flex-col h-full space-y-4"> {/* Added flex flex-col h-full, adjusted space-y */}
            {/* Add keys to direct children of the main content container */}
            {/* Segmented Mode Buttons */}
            <div key="mode-buttons" className="relative flex w-full p-1 bg-gray-100 dark:bg-gray-800 rounded-full">
              {/* Sliding Background */}
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 h-full w-1/2 bg-primary-light dark:bg-primary-dark rounded-full shadow-md"
                style={{
                  left: mode === 'chat' ? '0%' : '50%',
                }}
              />
              {/* Chat Button */}
              <button
                onClick={() => setMode('chat')}
                className={`relative z-10 flex-1 py-2.5 rounded-full transition-colors duration-300 ${
                  mode === 'chat' ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <MessageSquare size={20} className="mx-auto" />
              </button>
              {/* Audio Button */}
              <button
                onClick={() => setMode('audio')}
                className={`relative z-10 flex-1 py-2.5 rounded-full transition-colors duration-300 ${
                  mode === 'audio' ? 'text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Mic size={20} className="mx-auto" />
              </button>
            </div>

            {/* New Chat Button moved here */}
            <motion.button key="new-chat-button"
               whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createNewChat}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-full bg-primary-light dark:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus size={20} />
              <span className="font-medium">New Chat</span>
            </motion.button>

            {/* --- Conditional Section: Recent Chats or Voice Selection --- */}
            {mode === 'chat' ? (
              <div key="recent-chats-section" className="flex flex-col flex-grow mt-4 overflow-hidden">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex-shrink-0">Recent Chats</h2>
                <div className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar space-y-2 pr-1">
                  {sessionListItems}
                </div>
              </div>
            ) : (
              <div key="voice-selection-section" className="flex flex-col flex-grow mt-4 overflow-hidden space-y-3">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 flex-shrink-0">Select Voice</h2>
                
                {/* Voice Card */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 flex flex-col items-center space-y-3 shadow">
                   <span className="text-lg font-semibold text-text-light dark:text-text-dark">{capitalize(availableVoices[currentVoiceIndex])}</span>
                   
                   <div className="flex items-center justify-center space-x-4 w-full">
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handlePrevVoice}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                        aria-label="Previous voice"
                      >
                        <ChevronLeft size={20} />
                      </motion.button>

                      {/* Hidden Audio Element for Previews */}
                      <audio ref={audioRef} className="hidden" preload="auto" />

                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => playVoice(availableVoices[currentVoiceIndex])}
                        className="p-3 rounded-full bg-primary-light dark:bg-primary-dark text-white shadow-md"
                        // Determine playing state based on the specific URL being played
                        aria-label={(isVoicePlaying && currentVoiceUrl?.endsWith(availableVoices[currentVoiceIndex] + '.wav')) ? "Pause current voice sample" : "Play current voice sample"}
                      >
                        {(isVoicePlaying && currentVoiceUrl?.endsWith(availableVoices[currentVoiceIndex] + '.wav'))
                          ? <Pause size={20} className="fill-current" />
                          : <Play size={20} className="fill-current" />}
                      </motion.button>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleNextVoice}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-text-light dark:text-text-dark"
                        aria-label="Next voice"
                      >
                        <ChevronRight size={20} />
                      </motion.button>
                   </div>

                   <motion.button
                     whileHover={{ scale: 1.03 }}
                     whileTap={{ scale: 0.97 }}
                     onClick={handleSelectVoice} // Pass the function directly
                     disabled={selectedVoice === availableVoices[currentVoiceIndex]} // Disable if already selected
                     className={`w-full mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                       selectedVoice === availableVoices[currentVoiceIndex]
                         ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                         : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                     }`}
                   >
                     {selectedVoice === availableVoices[currentVoiceIndex] ? 'Selected' : `Select ${capitalize(availableVoices[currentVoiceIndex])}`}
                   </motion.button>
                </div>
                {/* Placeholder for potential future list/grid view if needed */}
              </div>
            )}
            {/* --- End Conditional Section --- */}

            {/* Model Selection Section */}
            {/* Model Selection Section - kept outside the scrollable area */}
            <div key="model-section" className="flex-shrink-0 space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700"> {/* Added flex-shrink-0, adjusted pt */}
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Model</h2>
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 group">
                <div className="flex items-center justify-between">
                  {isEditingModel ? (
                    <div className="flex items-center space-x-1 w-full"> {/* Adjusted: Removed flex-1, added w-full, adjusted spacing */}
                      <input
                        type="text"
                        value={tempModelName}
                        onChange={(e) => setTempModelName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            saveModelName();
                          }
                        }}
                        className="flex-grow min-w-0 px-2 py-1 rounded-full bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                        autoFocus
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={saveModelName}
                        className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"
                      >
                        <Check size={16} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={cancelEditingModel}
                        className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                      >
                        <X size={16} />
                      </motion.button>
                    </div>
                  ) : (
                    <>
                      <span className="truncate font-medium">{modelName}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent potential parent clicks
                            startEditingModel();
                          }}
                          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          <Edit size={16} />
                        </motion.button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
};
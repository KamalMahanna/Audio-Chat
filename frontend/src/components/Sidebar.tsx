import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit, Mic, MessageSquare, Check, X } from 'lucide-react';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

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
    fetchChatHistory, // Import fetchChatHistory
    setMode,
    setModelName // Import global setModelName
  } = useStore();

  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  // Remove local modelName state, use global from store
  const [isEditingModel, setIsEditingModel] = useState(false);
  // Initialize tempModelName with global modelName when editing starts
  const [tempModelName, setTempModelName] = useState('');

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

            <div key="recent-chats-section" className="flex flex-col flex-grow mt-4 overflow-hidden"> {/* Added flex-col, flex-grow, overflow-hidden, adjusted mt */}
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex-shrink-0">Recent Chats</h2> {/* Removed sticky/bg, added flex-shrink-0 */}
              {/* Scrollable container for list items */}
              <div className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar space-y-2 pr-1"> {/* Removed redundant bg-* classes */}
                {sessionListItems}
              </div>
            </div>

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
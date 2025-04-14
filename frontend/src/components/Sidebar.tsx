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
    setSessions, 
    setCurrentSession,
    setMode 
  } = useStore();

  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const createNewChat = () => {
    const newSession = {
      session_id: uuidv4(),
      chat_name: 'New Chat'
    };
    setSessions([...sessions, newSession]);
    setCurrentSession(newSession.session_id);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/delete_session/${sessionId}`);
      setSessions(sessions.filter(s => s.session_id !== sessionId));
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
      await fetch(`/update_chat_name/${sessionId}/${encodeURIComponent(newName)}`);
      setSessions(sessions.map(s => 
        s.session_id === sessionId ? { ...s, chat_name: newName } : s
      ));
      setEditingSession(null);
    } catch (error) {
      console.error('Failed to rename chat:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 top-0 h-full w-72 bg-surface-light dark:bg-surface-dark backdrop-blur-glass shadow-glass dark:shadow-glass-dark z-50 p-6"
        >
          <div className="space-y-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createNewChat}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-primary-light dark:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus size={20} />
              <span className="font-medium">New Chat</span>
            </motion.button>

            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('chat')}
                className={`flex-1 py-3 rounded-xl transition-all duration-300 ${
                  mode === 'chat' 
                    ? 'bg-primary-light dark:bg-primary-dark text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <MessageSquare size={20} className="mx-auto" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setMode('audio')}
                className={`flex-1 py-3 rounded-xl transition-all duration-300 ${
                  mode === 'audio' 
                    ? 'bg-primary-light dark:bg-primary-dark text-white shadow-lg' 
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Mic size={20} className="mx-auto" />
              </motion.button>
            </div>

            <div className="space-y-2 mt-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Recent Chats</h2>
              {sessions.map((session) => (
                <motion.div
                  key={session.session_id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-3 rounded-xl cursor-pointer group transition-all duration-300 ${
                    currentSession === session.session_id
                      ? 'bg-primary-light/10 dark:bg-primary-dark/10 shadow-lg'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    if (editingSession !== session.session_id) {
                      setCurrentSession(session.session_id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    {editingSession === session.session_id ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              renameChat(session.session_id, editingName);
                            }
                          }}
                          className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark"
                          autoFocus
                        />
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => renameChat(session.session_id, editingName)}
                          className="p-1 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500"
                        >
                          <Check size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={cancelEditing}
                          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>
                    ) : (
                      <>
                        <span className="truncate font-medium">{session.chat_name}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(session.session_id, session.chat_name);
                            }}
                            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            <Edit size={16} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.session_id);
                            }}
                            className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                          >
                            <Trash2 size={16} />
                          </motion.button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
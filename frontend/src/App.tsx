import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useStore } from './store';
import { Sidebar } from './components/Sidebar';
import { ChatMode } from './components/ChatMode';
import { AudioMode } from './components/AudioMode';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { mode, setSessions } = useStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await fetch('/get_session_id_n_names');
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };

    fetchSessions();
  }, [setSessions]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <div className="flex h-screen">
        {/* Mobile menu button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-6 left-6 z-50 p-3 rounded-xl bg-surface-light dark:bg-surface-dark shadow-glass dark:shadow-glass-dark backdrop-blur-glass"
        >
          <Menu size={24} />
        </motion.button>

        {/* Sidebar */}
        <div className="hidden lg:block w-72 h-full bg-surface-light dark:bg-surface-dark shadow-glass dark:shadow-glass-dark backdrop-blur-glass">
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40"
          >
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-6 right-6 p-3 rounded-xl bg-surface-light dark:bg-surface-dark shadow-glass dark:shadow-glass-dark backdrop-blur-glass"
            >
              <X size={24} />
            </motion.button>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 h-full overflow-hidden">
          {mode === 'chat' ? <ChatMode /> : <AudioMode />}
        </div>
      </div>
    </div>
  );
}

export default App;
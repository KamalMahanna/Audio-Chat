import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        const response = await fetch('http://localhost:8000/get_SessionId_n_names'); // Use full backend URL
        const data = await response.json();
        setSessions(data.chat_sessions); // Extract the array from the response object
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
    };

    fetchSessions();
  }, []); // Empty dependency array to run only once on mount

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100">
      <div className="flex h-screen">
        {/* Mobile menu button (Hamburger) - Fades out when sidebar is open */}
        <motion.button
          initial={{ opacity: 1 }} // Start visible
          animate={{ opacity: isSidebarOpen ? 0 : 1 }} // Animate opacity based on state
          transition={{ duration: 0.2 }} // Control animation speed
          whileHover={!isSidebarOpen ? { scale: 1.05 } : {}} // Only scale when visible
          whileTap={!isSidebarOpen ? { scale: 0.95 } : {}}   // Only scale when visible
          onClick={() => setIsSidebarOpen(true)} // Still only opens sidebar
          className={`lg:hidden fixed top-6 left-6 z-[60] p-3 rounded-xl bg-surface-light dark:bg-surface-dark shadow-glass dark:shadow-glass-dark backdrop-blur-glass ${
            isSidebarOpen ? 'pointer-events-none' : '' // Disable clicks when invisible
          }`}
        >
          <Menu size={24} /> {/* Always show Menu icon, opacity handles visibility */}
        </motion.button>

        {/* Sidebar */}
        <div className="relative hidden lg:block w-72 h-full"> {/* Removed bg, shadow, blur */}
          <Sidebar isOpen={true} onClose={() => {}} />
        </div>

        {/* Mobile Sidebar Overlay & Animation */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              key="mobile-sidebar-overlay" // Key for AnimatePresence
              ref={overlayRef}
              onClick={handleOverlayClick}
              className="lg:hidden fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300" /* Added basic transition class */
            >
              {/* Removed initial, animate, exit, transition props */}
              {/* Sidebar component now uses its own internal AnimatePresence */}
              <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 h-full overflow-hidden">
          {mode === 'chat' ? <ChatMode /> : <AudioMode />}
        </div>
      </div>
    </div>
  );
}

export default App;
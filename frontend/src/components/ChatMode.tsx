import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useStore } from '../store';
import { Message } from '../types';

export const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    currentSession, 
    messages,
    setMessages 
  } = useStore();

  const currentMessages = currentSession ? messages[currentSession] || [] : [];

  useEffect(() => {
    const fetchMessages = async () => {
      if (currentSession) {
        try {
          const response = await fetch(`/chat_history/${currentSession}`);
          const data = await response.json();
          setMessages(currentSession, data);
        } catch (error) {
          console.error('Failed to fetch messages:', error);
        }
      }
    };

    fetchMessages();
  }, [currentSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;

    const newMessage: Message = { human: input };
    setMessages(currentSession, [...currentMessages, newMessage]);
    setInput('');

    try {
      const response = await fetch(`/text/${currentSession}/model/${encodeURIComponent(input)}`);
      const aiResponse = await response.text();
      setMessages(currentSession, [...currentMessages, newMessage, { ai: aiResponse }]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentMessages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`flex ${message.ai ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[70%] p-4 rounded-2xl shadow-glass backdrop-blur-glass ${
                message.ai
                  ? 'bg-surface-light dark:bg-surface-dark mr-auto'
                  : 'bg-primary-light dark:bg-primary-dark text-white ml-auto'
              }`}
            >
              <p className="text-lg">{message.ai || message.human}</p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex space-x-4 items-center">
          <motion.input
            initial={false}
            animate={{ scale: input ? 1.02 : 1 }}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-4 rounded-xl bg-surface-light dark:bg-surface-dark shadow-glass backdrop-blur-glass text-lg focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition-all duration-300"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            className="p-4 rounded-xl bg-primary-light dark:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Send size={24} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};
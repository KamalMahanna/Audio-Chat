import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react'; // Import Loader2 icon
import { useStore } from '../store';
import { Message, ChatSession } from '../types'; // Changed Session to ChatSession for clarity
import { v4 as uuidv4 } from 'uuid';
import ReactMarkdown from 'react-markdown'; // Keep for human messages
import { AIMessageContent } from './AIMessageContent'; // Import the new component
import remarkGfm from 'remark-gfm';
import TextareaAutosize from 'react-textarea-autosize'; // Import TextareaAutosize

export const ChatMode: React.FC = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Add loading state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    currentSession, 
    sessions,     // Add sessions
    messages,
    modelName, // Import modelName from store
    setMessages,
    fetchChatHistory, // Import fetchChatHistory
    setSessions,    // Add setSessions
    setCurrentSession // Add setCurrentSession
  } = useStore();

  const currentMessages = currentSession ? messages[currentSession] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  const sendMessage = async () => {
    if (isLoading || !input.trim()) return; // Prevent sending while loading or if input is empty

    let targetSessionId = currentSession;
    // If no current session, create one before sending
    if (!targetSessionId) {
      targetSessionId = uuidv4();
      const newSession: ChatSession = {
        SessionId: targetSessionId,
        chat_name: 'New Chat' // Or derive from first message later
      };
      // Add to front of sessions list
      setSessions([newSession, ...useStore.getState().sessions]);
      setCurrentSession(targetSessionId);
      // Initialize messages for the new session
      setMessages(targetSessionId, []);
      console.log('Created and set new session:', targetSessionId);
    }

    const textToSend = input;
    setInput(''); // Clear input immediately

    // --- Add user message to state immediately ---
    if (targetSessionId) {
      const userMessage: Message = {
        _id: uuidv4(), // Generate a temporary unique ID
        type: 'human',
        content: textToSend,
      };
      // Append the new message to the existing messages for the session
      setMessages(targetSessionId, [
        ...(useStore.getState().messages[targetSessionId] || []),
        userMessage
      ]);
    }
    // -------------------------------------------

    setIsLoading(true); // Set loading true before sending
    try {
      console.log(`Sending message to session: ${targetSessionId} using model: ${modelName}`);
      // Construct the correct URL format
      const response = await fetch(`http://localhost:8000/text/${targetSessionId}/${modelName}/${encodeURIComponent(textToSend)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToSend }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // After successful response, refetch the history to get updated messages
      await fetchChatHistory(targetSessionId);

      // --- Fetch chat name after 4 pairs (8 messages) ---
      const updatedMessages = useStore.getState().messages[targetSessionId] || [];
      const currentSessionData = useStore.getState().sessions.find(s => s.SessionId === targetSessionId);

      if (updatedMessages.length === 6 && currentSessionData?.chat_name === 'New Chat') {
        console.log(`Fetching chat name for session: ${targetSessionId}`);
        try {
          const nameResponse = await fetch(`http://localhost:8000/get_chat_name/${targetSessionId}/${modelName}`, { // Added modelName
            method: 'POST', // Assuming POST based on task description
          });
          if (!nameResponse.ok) {
            throw new Error(`HTTP error! status: ${nameResponse.status}`);
          }
          const nameData = await nameResponse.json();
          if (nameData.summarized_chat_name) {
            console.log(`Updating chat name to: ${nameData.summarized_chat_name}`);
            // Update the session name in the global state
            const updatedSessions = useStore.getState().sessions.map(session =>
              session.SessionId === targetSessionId
                ? { ...session, chat_name: nameData.summarized_chat_name }
                : session
            );
            setSessions(updatedSessions);
          }
        } catch (nameError) {
          console.error('Failed to fetch or update chat name:', nameError);
        }
      }
      // -------------------------------------------------

    } catch (error) {
      console.error('Failed to send message:', error);
      // Optionally, show an error message to the user
      // Re-add the input to the input field if sending failed?
      // setInput(textToSend); // Uncomment if you want to restore input on failure
    } finally {
      setIsLoading(false); // Set loading false when done (success or error)
    }
  };

  // Handle key press for sending or new line
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLoading) return; // Do nothing if loading

    if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) { // Changed to check for !ctrlKey and !shiftKey
      e.preventDefault(); // Prevent default newline on Enter
      sendMessage();
    }
    // Let Ctrl+Enter (or Shift+Enter) create a newline by default
  };

  return (
    <div className="flex flex-col h-full">
      {/* Reverted to p-6 for symmetrical padding */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentMessages.map((message, index) => (
          <motion.div // Use message._id as key
            key={message._id || index} // Fallback to index if _id is missing somehow
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={`flex ${message.type === 'ai' ? 'justify-start' : 'justify-end'}`} // Use message.type
          >
            <div
              className={`max-w-[70%] p-4 rounded-2xl shadow-glass ${
                message.type === 'ai' // Use message.type
                  ? 'bg-surface-light dark:bg-surface-dark mr-auto'
                  : 'bg-primary-light dark:bg-primary-dark text-white ml-auto'
              }`}
            >
              <div className="prose dark:prose-invert max-w-none text-lg overflow-x-auto"> {/* Styling wrapper */}
                {message.type === 'ai' ? (
                  <AIMessageContent content={message.content} />
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown> // Human messages rendered normally
                )}
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reverted to p-6 for symmetrical padding */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-800">
        {/* Changed items-center to items-end to align button with bottom of textarea */}
        <div className="flex space-x-4 items-end">
          <motion.div className="flex-1" initial={false}> {/* Wrap Textarea for motion if needed */}
            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress} // Use the new key press handler
              placeholder={isLoading ? "Waiting for response..." : "Type message (Ctrl+Enter for new line)"}
              className="flex-1 w-full p-4 rounded-xl bg-surface-light dark:bg-surface-dark shadow-glass text-lg focus:outline-none focus:ring-2 focus:ring-primary-light dark:focus:ring-primary-dark transition-all duration-300 disabled:opacity-50 resize-none" // Changed rounded-full to rounded-xl, added resize-none
              disabled={isLoading} // Disable input while loading
              rows={1} // Start with 1 row
              maxRows={6} // Limit max height
            />
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={sendMessage}
            className="p-4 rounded-full bg-primary-light dark:bg-primary-dark text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading} // Disable button while loading
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" /> // Show spinner when loading
            ) : (
              <Send size={24} /> // Show send icon when not loading
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
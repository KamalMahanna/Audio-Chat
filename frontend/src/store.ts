import { create } from 'zustand';
import { ChatState } from './types';

export const useStore = create<ChatState>((set, get) => ({ // Added get to access state within actions
  sessions: [],
  currentSession: null,
  messages: {},
  mode: 'chat',
  isRecording: false,
  selectedVoice: 'default',
  modelName: 'gemini-2.5-flash-preview-04-17', // Default model name
  isHistoryLoading: false, // Initialize loading state
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (sessionId) => set({ currentSession: sessionId }),
  setMessages: (sessionId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [sessionId]: messages }
    })),
  setIsHistoryLoading: (isLoading) => set({ isHistoryLoading: isLoading }), // Implement setter
  fetchChatHistory: async (sessionId) => { // Implement fetch action
    if (!sessionId) return; // Don't fetch if no session is selected
    // Removed: if (get().messages[sessionId]) return; // Allow refetching history

    set({ isHistoryLoading: true });
    try {
      const response = await fetch(`http://localhost:8000/chat_history/${sessionId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure data is an array before setting
      if (Array.isArray(data)) {
        set((state) => ({
          messages: { ...state.messages, [sessionId]: data }
        }));
      } else {
        console.error('Invalid chat history data format: Expected an array.', data);
        // Optionally set an empty array or handle the error state
        set((state) => ({
          messages: { ...state.messages, [sessionId]: [] }
        }));
      }
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
       // Optionally set an empty array or handle the error state
       set((state) => ({
        messages: { ...state.messages, [sessionId]: [] }
      }));
    } finally {
      set({ isHistoryLoading: false });
    }
  },
  setMode: (mode) => set({ mode }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
  setModelName: (modelName) => set({ modelName }), // Add setter for model name
}));
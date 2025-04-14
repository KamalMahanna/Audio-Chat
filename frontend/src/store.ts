import { create } from 'zustand';
import { ChatState } from './types';

export const useStore = create<ChatState>((set) => ({
  sessions: [],
  currentSession: null,
  messages: {},
  mode: 'chat',
  isRecording: false,
  selectedVoice: 'default',
  setSessions: (sessions) => set({ sessions }),
  setCurrentSession: (sessionId) => set({ currentSession: sessionId }),
  setMessages: (sessionId, messages) => 
    set((state) => ({ 
      messages: { ...state.messages, [sessionId]: messages } 
    })),
  setMode: (mode) => set({ mode }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setSelectedVoice: (voice) => set({ selectedVoice: voice }),
}));
export interface ChatSession {
  SessionId: string;
  chat_name: string;
}

export type MessageType = 'ai' | 'human';

export interface Message {
  _id: string;
  type: MessageType;
  content: string;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSession: string | null;
  messages: Record<string, Message[]>;
  mode: 'chat' | 'audio';
  isRecording: boolean;
  selectedVoice: string;
  isHistoryLoading: boolean; // Added loading state
  modelName: string; // Added model name state
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  fetchChatHistory: (sessionId: string) => Promise<void>; // Added fetch action
  setMode: (mode: 'chat' | 'audio') => void;
  setIsRecording: (isRecording: boolean) => void;
  setSelectedVoice: (voice: string) => void;
  setIsHistoryLoading: (isLoading: boolean) => void; // Added setter for loading state
  setModelName: (modelName: string) => void; // Added setter for model name
}
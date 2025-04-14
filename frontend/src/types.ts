export interface ChatSession {
  session_id: string;
  chat_name: string;
}

export interface Message {
  ai?: string;
  human?: string;
}

export interface ChatState {
  sessions: ChatSession[];
  currentSession: string | null;
  messages: Record<string, Message[]>;
  mode: 'chat' | 'audio';
  isRecording: boolean;
  selectedVoice: string;
  setSessions: (sessions: ChatSession[]) => void;
  setCurrentSession: (sessionId: string | null) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  setMode: (mode: 'chat' | 'audio') => void;
  setIsRecording: (isRecording: boolean) => void;
  setSelectedVoice: (voice: string) => void;
}
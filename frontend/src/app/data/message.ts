export interface Message {
  model?: string;
  role: string;
  content: string;
  images?: string[];
  interrupted: boolean;
}

export interface StreamingMessage {
  chatID: string;
  message: Message;
  isGenerating: boolean;
  isResponding: boolean;
}

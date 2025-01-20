export interface Message {
  model?: string;
  role: string;
  content: string;
}

export interface StreamingMessage {
  chatID: string;
  message: Message;
  isGenerating: boolean;
  isResponding: boolean;
}

export interface Message {
  model?: string;
  role: string;
  content: string;
  images?: string[];
  interrupted: boolean;
  attachment_name?: string;
  attachment_type?: string;
}

export interface StreamingMessage {
  chatID: string;
  message: Message;
  isGenerating: boolean;
  isResponding: boolean;
}

export interface Images {
  images_array: string[];
}
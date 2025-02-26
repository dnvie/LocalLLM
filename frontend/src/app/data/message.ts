export interface Message {
  model?: string;
  role: string;
  content: string;
  thinking: string;
  images?: string[];
  interrupted: boolean;
  attachment_name?: string;
  attachment_type?: string;
  files?: string[];
  file_names? : string[];
  file_types? : string[];
}

export interface StreamingMessage {
  chatID: string;
  message: Message;
  isGenerating: boolean;
  isResponding: boolean;
  isThinking: boolean;
}

export interface Images {
  images_array: string[];
}
import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { Chats, Chat } from "../data/chat";
import { HttpClient } from "@angular/common/http";
import { Message } from "../data/message";
import { Observable } from "rxjs";

const baseUrl = "http://localhost:80";

@Injectable({
  providedIn: "root",
})
export class ChatService {
  private chatsSubject = new BehaviorSubject<{ chats: Chat[] }>({ chats: [] });
  models$ = this.chatsSubject.asObservable();

  private isDisabledSubject = new BehaviorSubject<boolean>(false);
  isDisabled$ = this.isDisabledSubject.asObservable();

  constructor(private http: HttpClient) {}

  setIsDisabled(isDisabled: boolean) {
    this.isDisabledSubject.next(isDisabled);
  }

  saveInterruptedMessage(chatID: string, message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      const messagePayload = {
        model: message.model,
        role: message.role,
        content: message.content
      };

      this.http.post(`${baseUrl}/addInterruptedMessage/${chatID}`, messagePayload).subscribe({
        next: () => {
          resolve();
        },
        error: (err) => {
          console.error("Error saving message:", err);
          reject(err);
        },
      });
    });
  }

  loadChats(userID: string): Promise<void> {
    /**
   TODO: Implement account system.
    */
    // Default user ID
    userID = "91a91610-7998-47e2-bbcb-e6fa98d3478d";
    if (this.chatsSubject.value.chats.length > 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.http.get<Chat[]>(`${baseUrl}/chats/${userID}`).subscribe({
        next: (data) => {
          const chats: Chats = { chats: data };
          this.chatsSubject.next(chats);
          resolve();
        },
        error: (err) => {
          console.error("Error loading chats:", err);
          reject(err);
        },
      });
    });
  }

  getChat(chatID: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${baseUrl}/chat/${chatID}`);
  }

  addChat(newChat: Chat): void {
    const currentChats = this.chatsSubject.value ?? { chats: [] };

    if (currentChats.chats && Array.isArray(currentChats.chats)) {
      const chatExists = currentChats.chats.some(
        (chat) => chat.id === newChat.id,
      );
      if (!chatExists) {
        currentChats.chats.unshift(newChat);
      }
    } else {
      currentChats.chats = [newChat];
    }
    this.chatsSubject.next({ chats: currentChats.chats });
  }

  deleteChat(chatId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.http.delete(`${baseUrl}/chat/${chatId}`).subscribe({
        next: () => {
          const currentChats = this.chatsSubject.value ?? { chats: [] };
          const updatedChats = currentChats.chats.filter(
            (chat) => chat.id !== chatId,
          );
          this.chatsSubject.next({ chats: updatedChats });

          resolve(true);
        },
        error: (err) => {
          console.error("Error deleting chat from the server:", err);
          resolve(false);
        },
      });
    });
  }

  updateTitle(chatID: string, newTitle: string): void {
    const currentChats = this.chatsSubject.value ?? { chats: [] };
    const chat = currentChats.chats.find((chat) => chat.id === chatID);

    if (chat) {
      const oldTitle = chat.title;
      chat.title = newTitle;
      this.chatsSubject.next({ ...currentChats });

      const requestBody = { title: newTitle };
      this.http
        .patch(`${baseUrl}/chat/title/${chatID}`, requestBody)
        .subscribe({
          next: () => {},
          error: (err) => {
            console.error("Error updating title on the server:", err);
            chat.title = oldTitle;
            this.chatsSubject.next({ ...currentChats });
          },
        });
    } else {
      console.warn(`Chat with ID ${chatID} not found.`);
    }
  }
}

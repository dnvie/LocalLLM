import { Injectable } from "@angular/core";
import { Observable, BehaviorSubject, Subject } from "rxjs";
import { Message, StreamingMessage } from "../data/message";
import { Router, NavigationEnd } from "@angular/router";
import { ChatService } from "./chat.service";
import { Chat } from "../data/chat";
import { filter } from "rxjs/operators";

const baseUrl = "http://localhost:80";

@Injectable({
  providedIn: "root",
})
export class StreamingService {
  private streamingMessage = new BehaviorSubject<StreamingMessage | null>(null);
  streamingMessage$ = this.streamingMessage.asObservable();

  private streamCompletionStatus = new BehaviorSubject<{
    [chatId: string]: boolean;
  }>({});
  streamCompletionStatus$ = this.streamCompletionStatus.asObservable();

  private currentChatID = new BehaviorSubject<string | null>(null);
  currentChatID$ = this.currentChatID.asObservable();

  private scrollToBottomSubject = new Subject<void>();
  scrollToBottom$ = this.scrollToBottomSubject.asObservable();

  private activeRequestController: AbortController | null = null;
  private messageSaved = false;

  triggerScrollToBottom() {
    this.scrollToBottomSubject.next();
  }

  getCurrentChatID(): string | null {
    return this.currentChatID.getValue();
  }

  constructor(
    private router: Router,
    private chatService: ChatService,
  ) {
    this.router.events
      .pipe(filter((rs): rs is NavigationEnd => rs instanceof NavigationEnd))
      .subscribe((event) => {
        this.streamingMessage.next(null);

        const match = event.url.match(/\/chat\/(.+)/);
        const chatID = match ? match[1] : null;
        this.currentChatID.next(chatID);
      });
  }

  private saveMessageToSession(message: Message, chatID: string) {
    if (this.messageSaved) return;
    
    const existingMessages: Message[] = JSON.parse(
      sessionStorage.getItem(chatID) || "[]",
    );
    existingMessages.push(message);
    sessionStorage.setItem(
      chatID,
      JSON.stringify(existingMessages),
    );
    this.messageSaved = true;
  }

  async interruptStream() {
    if (this.activeRequestController) {
      this.activeRequestController.abort();
      this.activeRequestController = null;

      const currentMessage = this.streamingMessage.getValue();
      if (currentMessage) {
        this.saveMessageToSession(currentMessage.message, currentMessage.chatID);

        try {
          await this.chatService.saveInterruptedMessage(
            currentMessage.chatID,
            currentMessage.message,
          );
        } catch (err) {
          console.error("Error saving interrupted message:", err);
        }

        const currentStatus = this.streamCompletionStatus.value;
        this.streamCompletionStatus.next({
          ...currentStatus,
          [currentMessage.chatID]: true,
        });

        this.streamingMessage.next({
          ...currentMessage,
          isGenerating: false,
          isResponding: false,
        });
      }
      this.chatService.setIsDisabled(false);
    }
  }

  sendQuery(selectedModel: string, queryText: string, chatId: string) {
    if (!queryText || !selectedModel) {
      console.log("Please provide both a query and a (valid) model");
      return;
    }
    this.messageSaved = false;
    this.interruptStream();

    const streamingMessage: StreamingMessage = {
      chatID: chatId,
      message: {
        model: selectedModel,
        role: "assistant",
        content: "",
      },
      isGenerating: true,
      isResponding: true,
    };

    this.streamingMessage.next(streamingMessage);

    this.streamText(selectedModel, queryText, chatId).subscribe({
      next: ({ chatID, chunk }) => {
        if (this.router.url === "/chat/new") {
          this.router.navigate([`/chat/${chatID}`]);

          const newChat: Chat = {
            id: chatID!,
            title: queryText.substring(0, 30),
          };
          this.chatService.addChat(newChat);
        }
        streamingMessage.isGenerating = false;
        streamingMessage.chatID = chatID!;
        streamingMessage.message.content += chunk;
        if (this.getCurrentChatID() === chatID) {
          this.triggerScrollToBottom();
        }
        this.streamingMessage.next({ ...streamingMessage });
      },
      error: (err) => {
        if (err.name === 'AbortError') {
          console.log('Stream was interrupted');
        } else {
          console.error("Streaming error:", err);
          const currentMessage = this.streamingMessage.getValue();
          if (currentMessage) {
            this.saveMessageToSession(currentMessage.message, currentMessage.chatID);
          }
        }
      },
      complete: () => {
        const currentMessage = this.streamingMessage.getValue();
        if (currentMessage && !currentMessage.message.content.trim()) {
          return;
        }

        if (currentMessage) {
          this.saveMessageToSession(currentMessage.message, currentMessage.chatID);
        }

        const currentStatus = this.streamCompletionStatus.value;
        this.streamCompletionStatus.next({
          ...currentStatus,
          [streamingMessage.chatID]: true,
        });

        this.streamingMessage.next({
          ...streamingMessage,
          isResponding: false,
        });

        this.chatService.setIsDisabled(false);
        this.activeRequestController = null;
      },
    });
  }

  streamText(
    model: string,
    query: string,
    chatID: string | null,
  ): Observable<{ chatID: string | null; chunk: string }> {
    return new Observable((observer) => {
      this.activeRequestController = new AbortController();
      const signal = this.activeRequestController.signal;

      const url = `${baseUrl}/chat/${model}/${chatID || "new"}`;
      const body = { query };
      const encoder = new TextDecoder();

      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      })
        .then((response) => {
          const chatID = response.headers.get("chat_id");
          const reader = response.body?.getReader();
          if (!reader) {
            observer.error("No readable stream available");
            return;
          }

          signal.addEventListener('abort', () => {
            reader.cancel();
            observer.complete();
          });

          function read() {
            reader!.read().then(({ done, value }) => {
              if (done) {
                observer.complete();
                return;
              }
              const chunk = encoder.decode(value, { stream: true });
              observer.next({ chatID, chunk });
              read();
            }).catch(error => {
              observer.error(error);
            });
          }
          read();
        })
        .catch((error) => {
          observer.error(error);
        });

      return () => {
        if (this.activeRequestController) {
          this.activeRequestController.abort();
        }
      };
    });
  }
}
import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { Models } from "../../data/models";
import { Message, StreamingMessage } from "../../data/message";
import { HomeService } from "../../service/home.service";
import { ModelService } from "../../service/models.service";
import { ModelSelectorComponent } from "../model-selector/model-selector.component";
import { FormsModule } from "@angular/forms";
import { Router, ActivatedRoute, NavigationEnd } from "@angular/router";
import { Model } from "../../data/models";
import { ChatService } from "../../service/chat.service";
import { filter } from "rxjs/operators";
import { ChangeDetectorRef } from "@angular/core";
import { MarkdownComponent, MarkdownModule } from "ngx-markdown";
import { StreamingService } from "../../service/streaming.service";
import { Subscription } from "rxjs";
import { SidebarCollapseButtonComponent } from "../sidebar-collapse-button/sidebar-collapse-button.component";

MarkdownModule.forRoot();

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [
    FormsModule,
    ModelSelectorComponent,
    MarkdownComponent,
    SidebarCollapseButtonComponent,
  ],
  templateUrl: "./chat.component.html",
  styleUrl: "./chat.component.scss",
})
export class ChatComponent implements OnInit {
  models: Models | null = null;
  messages: Message[] = [];
  queryText: string = "";
  selectedModel: Model | null = null;
  response: string = "";
  chatID: string | null = null;
  previousUrl: string | null = null;
  isDisabled: boolean = false;
  isGenerating: boolean = false;
  streamingMessage: StreamingMessage | null = null;
  isAtBottom: boolean = true;

  @ViewChild("queryTextArea") queryTextAreaRef!: ElementRef;
  @ViewChild("chatContainer") chatContainerRef!: ElementRef;

  private scrollSubscription!: Subscription;
  private sessionStorageSubscription!: Subscription;

  constructor(
    private service: HomeService,
    private modelService: ModelService,
    private chatService: ChatService,
    private router: Router,
    private route: ActivatedRoute,
    private cdRef: ChangeDetectorRef,
    private streamingService: StreamingService,
  ) {
    this.router.routeReuseStrategy.shouldReuseRoute = () => false;
    this.router.events
      .pipe(filter((rs): rs is NavigationEnd => rs instanceof NavigationEnd))
      .subscribe((event) => {
        if (event.id === 1 && event.url === event.urlAfterRedirects) {
          sessionStorage.clear();
        }
      });
  }

  preprocessMath(content: string): string {
    return content.replace(
      /```latex([\s\S]*?)```/g,
      (math) => `$$${math.trim()}$$`,
    );
  }

  sendQueryKeydown(event: KeyboardEvent) {
    if (
      event.keyCode === 13 ||
      event.key === "Enter" ||
      event.code === "Enter"
    ) {
      if (event.shiftKey) {
        return;
      } else {
        event.preventDefault();
        this.sendQuery();
        this.queryText = "";
        const textarea: HTMLTextAreaElement =
          this.queryTextAreaRef.nativeElement;
        textarea.style.height = "auto";
      }
    }
  }

  sendQuery() {
    if (this.selectedModel && this.queryText) {
      this.messages.push({
        model: this.selectedModel.name,
        content: this.queryText.toString(),
        role: "user",
        interrupted: false,
      });
      this.scrollToBottom();
      sessionStorage.setItem(this.chatID!, JSON.stringify(this.messages));
      console.log(JSON.parse(sessionStorage.getItem(this.chatID!)!));
      this.chatService.setIsDisabled(true);
      this.streamingService.sendQuery(
        this.selectedModel.name,
        this.queryText,
        this.chatID!,
      );
    }
  }

  handleInterrupt() {
    this.streamingService.interruptStream();
  }

  onTextAreaInput() {
    const textarea: HTMLTextAreaElement = this.queryTextAreaRef.nativeElement;
    textarea.style.height = "auto";
    if (textarea.scrollHeight > textarea.clientHeight) {
      textarea.style.height = Math.min(textarea.scrollHeight, 350) + "px";
    }
  }

  scrollToBottom(enableSmooth: boolean = false) {
    setTimeout(() => {
      const chatContainer = this.chatContainerRef?.nativeElement;
      if (chatContainer) {
        if (enableSmooth) {
          chatContainer.classList.add("smooth-scroll");
        } else {
          chatContainer.classList.remove("smooth-scroll");
        }
        chatContainer.scrollTop = chatContainer.scrollHeight;

        if (enableSmooth) {
          setTimeout(() => chatContainer.classList.remove("smooth-scroll"), 0);
        }
        this.isAtBottom = true;
      } else {
        console.error("Chat container is not available!");
      }
    }, 0);
  }

  checkScrollPosition() {
    const chatContainer = this.chatContainerRef?.nativeElement;

    if (chatContainer) {
      const isBottom =
        Math.abs(
          chatContainer.scrollHeight -
            chatContainer.scrollTop -
            chatContainer.clientHeight,
        ) < 30;
      this.isAtBottom = isBottom;
    }
  }

  ngOnInit(): void {
    window.addEventListener("beforeunload", this.preventUnload);

    this.scrollSubscription = this.streamingService.scrollToBottom$.subscribe(
      () => {
        if (this.isAtBottom) {
          this.scrollToBottom(false);
        }
      },
    );

    this.sessionStorageSubscription = this.streamingService.sessionStorageUpdated$.subscribe(
      (updatedChatId) => {
        if (this.chatID && updatedChatId === this.chatID) {
          const savedMessages = sessionStorage.getItem(this.chatID);
          if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
            this.cdRef.detectChanges();
          }
        }
      }
    );

    this.streamingService.streamingMessage$.subscribe((message) => {
      this.streamingMessage = message;
    });

    this.modelService.selectedModel$.subscribe((model) => {
      this.selectedModel = model;
    });

    this.chatService.isDisabled$.subscribe((disabled) => {
      this.isDisabled = disabled;
      setTimeout(() => this.queryTextAreaRef.nativeElement.focus(), 1);
    });

    const navigationState = history.state as {
      query?: string;
      messages?: Message[];
    };

    if (navigationState.messages) {
      this.messages.push(...navigationState.messages);
      this.route.paramMap.subscribe((paramMap) => {
        const newChatID = paramMap.get("id");
        this.chatID = newChatID;
      });
    } else {
      this.route.paramMap.subscribe((paramMap) => {
        const newChatID = paramMap.get("id");
        if (newChatID !== null && newChatID !== "" && newChatID !== "new") {
          this.chatID = newChatID;

          this.streamingService.streamCompletionStatus$.subscribe((status) => {
            if (status[this.chatID!]) {
              const savedMessages = sessionStorage.getItem(this.chatID!);
              if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
                this.cdRef.detectChanges();
                this.scrollToBottom(true);
              }
            }
          });

          if (sessionStorage.getItem(this.chatID) === null) {
            this.chatService.getChat(this.chatID).subscribe({
              next: (data) => {
                if (!navigationState.messages) {
                  this.messages = data;
                }
                this.scrollToBottom();
                if (data === null) {
                  this.router.navigate(["/"]);
                  return;
                }
              },
              error: (err) => {
                console.error("Error loading chat:", err);
              },
              complete: () => {
                sessionStorage.setItem(
                  this.chatID!,
                  JSON.stringify(this.messages),
                );
                this.cdRef.detectChanges();
              },
            });
          } else {
            console.log();
            this.messages = JSON.parse(sessionStorage.getItem(this.chatID!)!);
            this.scrollToBottom();
          }
        } else {
          console.log("else here");
          if (!navigationState.messages) {
            this.messages = [];
            console.log("msgs sset to null");
          }
          this.chatID = null;
        }
      });

      if (navigationState.query) {
        this.queryText = navigationState.query;
        this.sendQuery();
        this.queryText = "";
        history.replaceState({}, document.title);
      }
    }

    setTimeout(() => this.queryTextAreaRef.nativeElement.focus(), 1);
  }

  ngOnDestroy(): void {
    window.removeEventListener("beforeunload", this.preventUnload);
    this.scrollSubscription.unsubscribe();
  }

  ngAfterViewInit() {
    const chatContainer = this.chatContainerRef?.nativeElement;

    if (chatContainer) {
      chatContainer.addEventListener("scroll", () => {
        this.checkScrollPosition();
      });
    }
  }

  preventUnload = (event: BeforeUnloadEvent) => {
    if (this.streamingMessage && this.streamingMessage.isResponding) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
}

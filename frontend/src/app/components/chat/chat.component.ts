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
  images: string[] = [];
  selectedModel: Model | null = null;
  response: string = "";
  chatID: string | null = null;
  previousUrl: string | null = null;
  isDisabled: boolean = false;
  isGenerating: boolean = false;
  streamingMessage: StreamingMessage | null = null;
  isAtBottom: boolean = true;
  files: File[] = [];
  hasFiles: boolean = this.files.length != 0;

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
        this.images = [];
        this.hasFiles = false;
        this.files = [];
        const textarea: HTMLTextAreaElement =
          this.queryTextAreaRef.nativeElement;
        textarea.style.height = "auto";
      }
    }
  }

  simulateEnterPress() {
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    });
  
    this.sendQueryKeydown(event);
  }

  sendQuery() {
    if (this.selectedModel && this.queryText) {
      this.messages.push({
        model: this.selectedModel.name,
        content: this.queryText.toString(),
        role: "user",
        //images: this.images,
        interrupted: false,
      });
      this.scrollToBottom();
      sessionStorage.setItem(this.chatID!, JSON.stringify(this.messages));
      this.chatService.setIsDisabled(true);
      this.streamingService.sendQuery(
        this.selectedModel.name,
        this.queryText,
        this.images,
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

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.files = [file]
      this.hasFiles = this.files.length > 0
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        const base64String = e.target.result;
        const base64Data = base64String.split(",")[1];
        this.images = [base64Data];
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    } else {
      console.log("No file selected");
    }
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.images.splice(index, 1);
    this.hasFiles = this.files.length > 0
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
      images?: string[];
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
          if (!navigationState.messages) {
            this.messages = [];
          }
          this.chatID = null;
        }
      });

      if (navigationState.query) {
        this.queryText = navigationState.query;
        this.images = navigationState.images || [];
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

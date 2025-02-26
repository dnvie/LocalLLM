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
import { Attachment } from "../../data/attachment";

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
  imageFiles: File[] = [];
  attachment_name: string = "";
  attachment_type: string = "";
  hasImages: boolean = this.imageFiles.length != 0;
  files: Attachment[] = [];
  hasFiles: boolean = this.files.length != 0;
  hasAttachments: boolean = this.imageFiles.length != 0 || this.files.length != 0;

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
        if (this.queryText.trim() !== "") {
          this.sendQuery();
          this.queryText = "";
          this.removeAllAttachments()
          const textarea: HTMLTextAreaElement =
            this.queryTextAreaRef.nativeElement;
          textarea.style.height = "auto";
        }
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
      var currentMessages = JSON.parse(JSON.stringify(this.messages));
      var currentImage = JSON.parse(JSON.stringify(this.images));
      currentMessages.push({
        model: this.selectedModel.name,
        content: this.queryText.toString(),
        thinking: "",
        role: "user",
        images: [],
        interrupted: false,
        attachment_name: this.attachment_name,
        attachment_type: this.attachment_type,
        files: [],
        file_names: this.files.map(file => file.name) || [],
        file_types: this.files.map(file => file.type) || [],
      });
      this.messages.push({
        model: this.selectedModel.name,
        content: this.queryText.toString(),
        thinking: "",
        role: "user",
        images: currentImage,
        interrupted: false,
        attachment_name: this.attachment_name,
        attachment_type: this.attachment_type,
        files: [],
        file_names: this.files.map(file => file.name) || [],
        file_types: this.files.map(file => file.type) || [],
      });
      this.scrollToBottom();
      try {
        sessionStorage.setItem(this.chatID!, JSON.stringify(currentMessages));
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          var sessionMessages = JSON.parse(sessionStorage.getItem(this.chatID!)!);
          sessionStorage.clear();
          sessionStorage.setItem(this.chatID!, JSON.stringify(sessionMessages));
        } else {
          console.error("An error occurred while saving to sessionStorage:", error);
        }
      }
      
      this.chatService.setIsDisabled(true);
      this.streamingService.sendQuery(
        this.selectedModel.name,
        this.queryText,
        this.images,
        this.attachment_name,
        this.attachment_type,
        this.chatID!,
        this.files
      );
      this.removeAllAttachments();
      this.attachment_name = "";
      this.attachment_type = "";
      this.images = [];
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

  onImageUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFiles = [file]
      this.hasImages = this.imageFiles.length > 0
      this.hasAttachments = this.imageFiles.length > 0 || this.files.length > 0
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const base64String = e.target.result;
        const base64Data = base64String.split(",")[1];
        this.images = [base64Data];
        this.attachment_name = file.name;
        this.attachment_type = file.type;
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    } else {
      console.log("No file selected");
    }
  }

  onFileUpload(event: any) {
    for (let i = 0; i < event.target.files.length; i++) {
      const file = event.target.files[i];
      if (file) {
        const reader = new FileReader();
        reader.readAsText(file)
        reader.onload = () => {
          const fileContent = reader.result as string

          for (let i = 0; i < this.files.length; i++) {
            if (file.name === this.files[i].name) {
              if (fileContent === this.files[i].file) {
                return
              }
            }
          }
          this.files.push({file: fileContent, name: file.name, type: file.type || 'file/'+file.name.split('.').pop()});
          this.hasFiles = this.files.length > 0
          this.hasAttachments = this.imageFiles.length > 0 || this.files.length > 0
        };
      }
    }
    event.target.value = "";
  }

  removeImage(index: number) {
    this.imageFiles.splice(index, 1);
    this.images.splice(index, 1);
    this.attachment_name = "";
    this.attachment_type = "";
    this.hasImages = this.imageFiles.length > 0
    this.hasAttachments = this.imageFiles.length > 0 || this.files.length > 0
  }

  removeFile(index: number) {
    this.files.splice(index, 1);
    this.hasFiles = this.files.length > 0
    this.hasAttachments = this.imageFiles.length > 0 || this.files.length > 0
  }

  removeAllAttachments() {
    this.imageFiles = [];
    this.images = [];
    this.hasImages = false;
    this.attachment_name = "";
    this.attachment_type = "";
    this.files = [];
    this.hasFiles = false;
    this.hasAttachments = false;
    this.hasAttachments = this.imageFiles.length > 0 || this.files.length > 0
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
            const sessionMessages = JSON.parse(savedMessages);
            for (let i = 0; i < this.messages.length; i++) {
              var currentImage = this.messages[i].images;
              sessionMessages[i].images = currentImage;
            }
            this.messages = sessionMessages
            this.cdRef.detectChanges();
            this.scrollToBottom(true);
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
      if (this.queryTextAreaRef) {
        setTimeout(() => this.queryTextAreaRef.nativeElement.focus(), 1);
      }
    });

    const navigationState = history.state as {
      query?: string;
      messages?: Message[];
      images?: string[];
      attachment_name?: string;
      attachment_type?: string;
      files?: Attachment[];
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
                const sessionMessages = JSON.parse(savedMessages);
                for (let i = 0; i < this.messages.length; i++) {
                  var currentImage = this.messages[i].images;
                  sessionMessages[i].images = currentImage;
                }
                this.messages = sessionMessages
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
                var currentMessages = JSON.parse(JSON.stringify(this.messages));
                for (let i = 0; i < this.messages.length; i++) {
                  currentMessages[i].images = [];
                }
                try {
                  sessionStorage.setItem(this.chatID!, JSON.stringify(currentMessages));
                } catch (error) {
                  if (error instanceof DOMException && error.name === "QuotaExceededError") {
                    var sessionMessages = JSON.parse(sessionStorage.getItem(this.chatID!)!);
                    sessionStorage.clear();
                    sessionStorage.setItem(this.chatID!, JSON.stringify(sessionMessages));
                  } else {
                    console.error("An error occurred while saving to sessionStorage:", error);
                  }
                }
                this.cdRef.detectChanges();
              },
            });
          } else {
            this.messages = JSON.parse(sessionStorage.getItem(this.chatID!)!);

            let count = 0;
            for (let i = 0; i < this.messages.length; i++) {
              if (this.messages[i].attachment_name !== "") {
                count++;
              }
            }
            if (count > 0) {
              this.chatService.getImages(this.chatID!).subscribe({
                next: (data) => {
                  let index = 0;
                  for (let i = 0; i < this.messages.length; i++) {
                    if (this.messages[i].attachment_name !== "") {
                      this.messages[i].images = [data.images_array[index]];
                      index++;
                    }
                  }
                  this.cdRef.detectChanges();
                },
                error: (err) => {
                  console.error("Error loading images:", err);
                },
              });
            }
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
        this.attachment_name = navigationState.attachment_name || "";
        this.attachment_type = navigationState.attachment_type || "";
        this.files = navigationState.files || [];
        this.sendQuery();
        this.queryText = "";
        history.replaceState({}, document.title);
      }
    }

    if (this.queryTextAreaRef) {
      setTimeout(() => this.queryTextAreaRef.nativeElement.focus(), 1);
    }
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

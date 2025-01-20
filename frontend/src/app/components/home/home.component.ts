import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { Models } from "../../data/models";
import { Message } from "../../data/message";
import { FormsModule } from "@angular/forms";
import { Router, NavigationEnd } from "@angular/router";
import { ModelSelectorComponent } from "../model-selector/model-selector.component";
import { Model } from "../../data/models";
import { ModelService } from "../../service/models.service";
import { ChatService } from "../../service/chat.service";
import { SidebarCollapseButtonComponent } from "../sidebar-collapse-button/sidebar-collapse-button.component";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    FormsModule,
    ModelSelectorComponent,
    SidebarCollapseButtonComponent,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.scss",
})
export class HomeComponent implements OnInit {
  models: Models = {
    models: [],
  };

  messages: Message[] = [];

  queryText: String = "";
  selectedModel: Model | null = null;
  response: String = "";
  isDisabled: boolean = false;

  @ViewChild("queryTextArea") queryTextAreaRef!: ElementRef;
  @ViewChild("chatContainer") chatContainerRef!: ElementRef;

  constructor(
    private chatService: ChatService,
    private router: Router,
    private modelService: ModelService,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.remove();
      }
    });
  }

  reveal() {
    setTimeout(
      () => document.getElementById("1")!.classList.remove("unrevealed"),
      30 - 30,
    );
    setTimeout(
      () => document.getElementById("2")!.classList.remove("unrevealed"),
      50 - 30,
    );
    setTimeout(
      () => document.getElementById("3")!.classList.remove("unrevealed"),
      70 - 30,
    );
    setTimeout(
      () => document.getElementById("4")!.classList.remove("unrevealed"),
      90 - 30,
    );
    setTimeout(
      () => document.getElementById("5")!.classList.remove("unrevealed"),
      50 - 30,
    );
    setTimeout(
      () => document.getElementById("6")!.classList.remove("unrevealed"),
      70 - 30,
    );
    setTimeout(
      () => document.getElementById("7")!.classList.remove("unrevealed"),
      90 - 30,
    );

    setTimeout(
      () => document.getElementById("8")!.classList.remove("unrevealed2"),
      110 - 30,
    );
  }

  remove() {
    for (let i = 1; i < 8; i++) {
      document.getElementById(i.toString())!.classList.add("unrevealed");
    }
    document.getElementById("8")!.classList.add("unrevealed2");
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
        this.router.navigate([`/chat/new`], {
          state: { query: this.queryText },
        });

        this.queryText = "";
        const textarea: HTMLTextAreaElement =
          this.queryTextAreaRef.nativeElement;
        textarea.style.height = "auto";
      }
    }
  }

  onTextAreaInput() {
    const textarea: HTMLTextAreaElement = this.queryTextAreaRef.nativeElement;
    textarea.style.height = "auto";
    if (textarea.scrollHeight > textarea.clientHeight) {
      textarea.style.height = Math.min(textarea.scrollHeight, 350) + "px";
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const chatContainer = this.chatContainerRef.nativeElement;
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);
  }

  ngOnInit(): void {
    this.modelService.selectedModel$.subscribe((model) => {
      this.selectedModel = model;
    });

    this.chatService.isDisabled$.subscribe((isDisabled) => {
      this.isDisabled = isDisabled;
    });
    this.reveal();

    setTimeout(() => this.queryTextAreaRef.nativeElement.focus(), 1);
  }
}

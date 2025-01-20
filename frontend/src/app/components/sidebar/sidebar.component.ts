import { AfterViewInit, Component, OnInit } from "@angular/core";
import { NavigationStart, Router } from "@angular/router";
import { Chats } from "../../data/chat";
import { ChatService } from "../../service/chat.service";
import { QueryList, ViewChildren } from "@angular/core";
import { HostListener } from "@angular/core";
import { NavigationEnd } from "@angular/router";
import { SidebarService } from "../../service/sidebar.service";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [],
  templateUrl: "./sidebar.component.html",
  styleUrl: "./sidebar.component.scss",
})
export class SidebarComponent implements OnInit, AfterViewInit {
  chats: Chats = {
    chats: [],
  };
  activeChatId: string | null = null;
  openMenuChatId: string | null = null;

  @ViewChildren("chatWrapper") chatWrappers!: QueryList<any>;

  constructor(
    private router: Router,
    private service: ChatService,
    private sidebarService: SidebarService,
  ) {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setActiveChatFromRoute();
      }
    });
  }

  goToChat(id: string) {
    this.router.navigate([`/chat/${id}`]);
    this.activeChatId = id;
    this.updateActiveChat();
  }

  goHome() {
    this.router.navigate(["/"]);
  }

  ngOnInit() {
    this.service.models$.subscribe((chats) => {
      if (chats) this.chats = chats;
    });

    this.sidebarService.collapseSidebar$.subscribe(() => {
      setTimeout(
        () => (
          document.getElementById("frame")!.classList.toggle("collapsed"), 10
        ),
      );
    });
  }

  ngAfterViewInit() {
    this.chatWrappers.changes.subscribe(() => {
      this.updateActiveChat();
    });
  }

  setActiveChatFromRoute() {
    const urlPath = this.router.url;
    if (urlPath === "/") {
      this.activeChatId = null;
    } else {
      const urlChatId = urlPath.split("/").pop();
      if (urlChatId && urlChatId !== this.activeChatId) {
        this.activeChatId = urlChatId;
      }
    }
    this.updateActiveChat();
  }

  updateActiveChat() {
    this.chatWrappers.forEach((wrapper: any) => {
      wrapper.nativeElement.classList.remove("active");
    });
    const activeWrapper = this.chatWrappers.find((wrapper: any) => {
      return wrapper.nativeElement.id === this.activeChatId; // Match ID
    });
    if (activeWrapper) {
      activeWrapper.nativeElement.classList.add("active");
    }
  }

  toggleMenu(chatId: string, event: MouseEvent) {
    event.stopPropagation();
    this.openMenuChatId = this.openMenuChatId === chatId ? null : chatId;
  }

  updateTitle(chatId: string) {
    const newTitle = prompt("Enter a new title for the chat:");
    if (newTitle !== null && newTitle.trim() !== "") {
      this.service.updateTitle(chatId, newTitle);
    }
    this.openMenuChatId = null;
  }

  createNewChat() {
    this.router.navigate(["/"]);
  }

  async deleteChat(chatId: string) {
    const confirmation = confirm("Are you sure you want to delete this chat?");
    if (confirmation) {
      const result = await this.service.deleteChat(chatId);
      if (result) {
        this.router.navigate(["/"]);
        sessionStorage.removeItem(chatId);
      } else {
        console.error("Failed to delete chat");
      }
    }
    this.openMenuChatId = null;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    this.openMenuChatId = null;
  }
}

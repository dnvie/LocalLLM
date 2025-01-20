import { Component, OnInit } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { FormsModule } from "@angular/forms";
import { SidebarComponent } from "./components/sidebar/sidebar.component";
import { ChatService } from "./service/chat.service";
import { MarkdownComponent } from "ngx-markdown";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, FormsModule, SidebarComponent, MarkdownComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent implements OnInit {
  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.loadChats("user-id-placeholder").catch((err) => {
      console.error("Failed to load chats:", err);
    });
  }
}

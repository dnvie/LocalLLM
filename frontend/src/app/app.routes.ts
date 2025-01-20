import { Routes } from "@angular/router";
import { HomeComponent } from "./components/home/home.component";
import { ChatComponent } from "./components/chat/chat.component";

export const routes: Routes = [
  { path: "", component: HomeComponent, title: "LocalLLM" },
  { path: "chat/:id", component: ChatComponent, title: "LocalLLM/Chat" },
  { path: "**", redirectTo: "", pathMatch: "full" },
];

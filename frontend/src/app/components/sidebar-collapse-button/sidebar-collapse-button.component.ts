import { Component } from "@angular/core";
import { SidebarService } from "../../service/sidebar.service";

@Component({
  selector: "app-sidebar-collapse-button",
  standalone: true,
  imports: [],
  templateUrl: "./sidebar-collapse-button.component.html",
  styleUrl: "./sidebar-collapse-button.component.scss",
})
export class SidebarCollapseButtonComponent {
  constructor(private service: SidebarService) {}

  toggleSidebar() {
    this.service.triggerCollapseSidebar();
  }
}

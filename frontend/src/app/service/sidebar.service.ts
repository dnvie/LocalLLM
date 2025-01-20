import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class SidebarService {
  private collapseSidebarSubject = new Subject<void>();
  collapseSidebar$ = this.collapseSidebarSubject.asObservable();

  triggerCollapseSidebar() {
    this.collapseSidebarSubject.next();
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  isSidebarOpen = signal(false);

  toggle() {
    this.isSidebarOpen.update(v => !v);
  }

  close() {
    this.isSidebarOpen.set(false);
  }

}

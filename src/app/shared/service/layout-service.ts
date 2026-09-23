import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {

  private readonly _isSidebarOpen = signal(false);
  readonly isSidebarOpen = this._isSidebarOpen.asReadonly();

  toggle() {
    this._isSidebarOpen.update(v => !v);
  }

  close() {
    this._isSidebarOpen.set(false);
  }

}

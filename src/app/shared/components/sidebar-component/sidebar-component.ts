import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LayoutService } from '../../service/layout-service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-sidebar-component',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.toggled]': 'isSidebarOpen()',
  },
})
export class SidebarComponent { 

  private readonly layoutService = inject(LayoutService);

  protected readonly isSidebarOpen = this.layoutService.isSidebarOpen;
  private readonly authService = inject(AuthService);

  protected readonly currentUserRole = this.authService.currentUserRole;

  protected closeSidebar(): void {
    this.layoutService.close();
  }

  protected logout(): void {
    this.authService.logout();
  }

}

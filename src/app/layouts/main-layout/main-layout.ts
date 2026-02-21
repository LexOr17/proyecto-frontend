import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar-component/sidebar-component';
import { HeaderComponent } from '../../shared/components/header-component/header-component';
import { LayoutService } from '../../shared/service/layout-service';


@Component({
  selector: 'app-main-layout',
  imports: [SidebarComponent, HeaderComponent, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'closeSidebar()',
  },
})
export class MainLayout { 

  private readonly layoutService = inject(LayoutService);

  protected readonly isSidebarOpen = this.layoutService.isSidebarOpen;

  protected closeSidebar(): void {
    this.layoutService.close();
  }

}

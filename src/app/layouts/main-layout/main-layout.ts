import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../../shared/components/sidebar-component/sidebar-component';
import { HeaderComponent } from '../../shared/components/header-component/header-component';
import { LayoutService } from '../../shared/service/layout-service';


@Component({
  selector: 'app-main-layout',
  imports: [SidebarComponent, HeaderComponent, RouterOutlet],
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.css'],
})
export class MainLayout { 

  public layoutService = inject(LayoutService);

}

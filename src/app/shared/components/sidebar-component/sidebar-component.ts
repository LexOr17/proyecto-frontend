import { Component, inject } from '@angular/core';
import { LayoutService } from '../../service/layout-service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-sidebar-component',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar-component.html',
  styleUrls: ['./sidebar-component.css'],
})
export class SidebarComponent { 

  public layoutService = inject(LayoutService);
  private authService = inject(AuthService);


  logout() {
    this.authService.logout();
  }

}

import { Component, inject } from '@angular/core';
import { LayoutService } from '../../service/layout-service';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  styleUrls: ['./header-component.css'],
})
export class HeaderComponent { 

  public layoutService = inject(LayoutService);

}

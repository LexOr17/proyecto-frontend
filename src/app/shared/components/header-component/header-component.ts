import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { LayoutService } from '../../service/layout-service';
import { AuthService } from '../../../core/services/auth-service';

@Component({
  selector: 'app-header-component',
  imports: [],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.toggled]': 'isSidebarOpen()',
  },
})
export class HeaderComponent {

  private readonly layoutService = inject(LayoutService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSidebarOpen = this.layoutService.isSidebarOpen;
  protected readonly currentUserRole = this.authService.currentUserRole;
  protected readonly pageTitle = signal('Inicio');

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getDeepestRouteTitle(this.activatedRoute)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(title => this.pageTitle.set(title));
  }

  protected toggleSidebar(): void {
    this.layoutService.toggle();
  }

  private getDeepestRouteTitle(route: ActivatedRoute): string {
    let child = route;
    while (child.firstChild) {
      child = child.firstChild;
    }
    return child.snapshot.title || 'Inicio';
  }

}

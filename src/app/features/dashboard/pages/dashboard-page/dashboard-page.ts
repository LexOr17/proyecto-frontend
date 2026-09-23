import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminDashboardComponent } from '../../components/admin-dashboard/admin-dashboard';
import { NutriologoDashboardComponent } from '../../components/nutriologo-dashboard/nutriologo-dashboard';
import { PacienteDashboardComponent } from '../../components/paciente-dashboard/paciente-dashboard';
import { AuthService } from '../../../../core/services/auth-service';
import { UserRole } from '../../../../core/interfaces/auth-response';


@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AdminDashboardComponent,
    NutriologoDashboardComponent,
    PacienteDashboardComponent,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.css'
})
export class DashboardPage {
  readonly authService = inject(AuthService);
  readonly UserRole = UserRole;
}

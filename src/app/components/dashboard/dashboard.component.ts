import { Component } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { MatIconModule } from '@angular/material/icon';
import { AppService } from '../../modules/shared/http/appService';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [HeaderComponent, MatIconModule],
})
export class DashboardComponent {
  constructor(private _appService: AppService) {}

  logout(): void {
    this._appService.logout();
  }
}

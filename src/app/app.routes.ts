import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './modules/shared/auth/guards/auth.guard';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { BitcoinChartComponent } from './components/bitcoin-chart-component/bitcoin-chart-component';
import { BitcoinCandleChartComponent } from './components/bitcoin-candle-chart-component/bitcoin-candle-chart-component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    component: DashboardComponent,
  },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'bitcoin', component: BitcoinChartComponent },
  { path: 'bitcoin2', component: BitcoinCandleChartComponent}
];

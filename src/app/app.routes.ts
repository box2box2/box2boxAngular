import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { LoginComponent } from './components/login/login.component';
import { authGuard } from './modules/shared/auth/guards/auth.guard';
import { PosShopGuard } from './modules/shared/auth/guards/posshop.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [authGuard],
    component: DashboardComponent,
  },
  { path: 'login', component: LoginComponent },
  {
    path: 'pos',
    canActivate: [authGuard, PosShopGuard],
    loadChildren: () =>
      import('./modules/pos/pos.routes').then((m) => m.PosRoutes),
  },
  {
    path: 'back-office',
    canActivate: [authGuard, PosShopGuard],
    loadChildren: () =>
      import('./modules/back-office/back-office.routes').then(
        (m) => m.BackOfficeRoutes,
      ),
  },
  {
    path: 'time',
    canActivate: [authGuard, PosShopGuard],
    loadChildren: () =>
      import('./modules/time/time.routes').then((m) => m.TimeRoutes),
  },
  {
    path: 'prognose',
    canActivate: [authGuard, PosShopGuard],
    loadChildren: () =>
      import('./modules/prognose/prognose.routes').then(
        (m) => m.PrognoseRoutes,
      ),
  },
];

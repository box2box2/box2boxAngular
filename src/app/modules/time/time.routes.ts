import { Routes } from '@angular/router';
import { TimeViewComponent } from './time-view.component';
import { TimeTableComponent } from './components/time-table/time-table.component';

export const TimeRoutes: Routes = [
  {
    path: '',
    component: TimeViewComponent,
    children: [
      {
        path: 'time-table',
        component: TimeTableComponent
      },
      {
        path: '',
        redirectTo: 'time-table',
        pathMatch: 'full'
      }
    ]
  }
];

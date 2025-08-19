import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../../components/header/header.component';
import { UiAction } from '../../../shared/contracts/UiActions';
import { SharedService } from '../../../shared/http/shared.service';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-time-header',
  imports: [HeaderComponent, RouterModule, MatDivider, MatIcon],
  templateUrl: './time-header.component.html',
  styleUrl: './time-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
export class TimeHeaderComponent {
  @Output() clickAction = new EventEmitter<UiAction>();

  public actions: UiAction[] = [
    {
      label: 'Vernieuwen',
      id: 'refresh',
      icon: 'refresh',
    },
  ];

  constructor(
    private _router: Router,
    private _sharedService: SharedService,
  ) {}

  logout(): void {
    this._sharedService.clearAllStates();
    this._router.navigate(['/login']);
  }
}

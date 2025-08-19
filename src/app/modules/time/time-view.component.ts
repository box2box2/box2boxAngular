import { Component, ChangeDetectionStrategy } from '@angular/core';
import { UiAction } from '../shared/contracts/UiActions';
import { SharedService } from '../shared/http/shared.service';
import { RouterOutlet } from '@angular/router';
import { SideNavComponent } from './common/side-nav/side-nav.component';
import { TimeHeaderComponent } from './common/time-header/time-header.component';

@Component({
  templateUrl: './time-view.component.html',
  styleUrl: './time-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { view: 'time' },
  standalone: true,
  imports: [RouterOutlet, TimeHeaderComponent, SideNavComponent],
})
export class TimeViewComponent {
  constructor(private _sharedService: SharedService) {}

  actionClicked(action: UiAction): void {
    this._sharedService.emitAction(action);
  }
}

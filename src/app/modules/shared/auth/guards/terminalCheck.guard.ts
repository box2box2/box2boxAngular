import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SharedService } from '../../http/shared.service';
import { firstValueFrom, take } from 'rxjs';
import { TerminalHttpService } from '../../http/v2/terminal.http.service';
import { PosV2Service } from '../../../pos/services/pos.service';
import { PosActions } from '../../../pos/store/pos.actions';

@Injectable({
  providedIn: 'root'
})
export class TerminalCheckGuard implements CanActivate {
  constructor(
    private _posService: PosV2Service,
    private _router: Router,
    private _sharedService: SharedService,
    private _terminalHttpServive: TerminalHttpService
  ) {}
  async canActivate(): Promise<boolean> {
    try {
      const terminal = await firstValueFrom(this._posService.getSelectedTerminal());
      if (!terminal?.Account.id) {
        throw new Error('No terminal ID found');
      }
      const updatedTerminal = await firstValueFrom(this._terminalHttpServive.getTerminalById(terminal.Account.id).pipe(take(1)));
      this._posService.dispatchPosAction(PosActions.setTerminal({ terminal: updatedTerminal }));
      if (updatedTerminal?.Drawer?.Status?.Key === '10' || updatedTerminal?.Drawer?.Status?.Key === '99') {
        return true;
      }
      alert('Kassa inhoud niet bevestigd');
      this._sharedService.logout();
      await this._router.navigate(['/login']);
      return false;
    } catch (error) {
      console.error('Error fetching terminal:', error);
      this._sharedService.logout();
      await this._router.navigate(['/login']);
      return false;
    }
  }
}

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SharedService } from '../../http/shared.service';
import { PosV2Service } from '../../../pos/services/pos.service';

@Injectable({
  providedIn: 'root'
})
export class TerminalGuard implements CanActivate {
  constructor(
    private _posService: PosV2Service,
    private _router: Router,
    private _sharedService: SharedService
  ) {}

  async canActivate(): Promise<boolean> {
    if (this._posService.getSelectedTerminal()) {
      return true;
    }
    alert('You are not allowed to access this page, select terminal first');
    this._sharedService.logout();
    await this._router.navigate(['/login']);
    return false;
  }
}

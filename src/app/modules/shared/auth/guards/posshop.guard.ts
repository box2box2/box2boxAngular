import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SharedService } from '../../http/shared.service';
import { firstValueFrom } from 'rxjs';
import { PosV2Service } from '../../../pos/services/pos.service';

@Injectable({
  providedIn: 'root'
})
export class PosShopGuard implements CanActivate {
  constructor(
    private _posService: PosV2Service,
    private _router: Router,
    private _sharedService: SharedService
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const shopAccount = await firstValueFrom(this._posService.getPosShopAccount());

      if (shopAccount) {
        return true;
      }
    } catch (error) {
      console.error('Error fetching shop account:', error);
    }

    alert('You are not allowed to access this page, select shop first');
    this._sharedService.logout();
    await this._router.navigate(['/login']);
    return false;
  }
}

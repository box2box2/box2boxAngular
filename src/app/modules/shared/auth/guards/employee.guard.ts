import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SharedService } from '../../http/shared.service';
import { PosV2Service } from '../../../pos/services/pos.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeGuard implements CanActivate {
  constructor(
    private _posService: PosV2Service,
    private _router: Router,
    private _sharedService: SharedService
  ) {}

  async canActivate(): Promise<boolean> {
    try {
      const shopAccount = await firstValueFrom(this._posService.getSelectedEmployee());

      if (shopAccount) {
        return true;
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
    }

    alert('You are not allowed to access this page, select employee first');
    this._sharedService.logout();
    await this._router.navigate(['/login']);
    return false;
  }
}

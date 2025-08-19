import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SharedService } from '../../http/shared.service';
import { lastValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = async () => {
  const userService = inject(SharedService);
  const router = inject(Router);

  const isAuthorized = await lastValueFrom(userService.isAuthorized());

  if (isAuthorized) {
    return true;
  } else {
    return router.navigate(['/login']);
  }
};

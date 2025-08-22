// import { inject } from '@angular/core';
// import { CanActivateFn, Router } from '@angular/router';
// import { lastValueFrom } from 'rxjs';
// import { AppService } from '../../http/appService';

import { CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = async () => {
  //const userService = inject(AppService);
  //const router = inject(Router);

  //const isAuthorized = await lastValueFrom(userService.isAuthorized());

  //  if (isAuthorized) {
  return true;
  //  } else {
  //  return router.navigate(['/login']);
  // }
};

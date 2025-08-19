import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { LoginResponse } from '../modules/shared/dtos/shared/login.dto';
import { ShopFullDTO } from '../modules/shared/dtosV2/posShop/shopFull.dto';

export const AppActions = createActionGroup({
  source: 'AppState',
  events: {
    clear: emptyProps(),
    setPosShopAccount: props<{ posShopAccount: ShopFullDTO }>(),
    setToken: props<{ token: LoginResponse }>(),
    setUsername: props<{ username: string }>(),
    setPortalSessionContact: props<{ portalSessionContact: string }>(),
    setSessionId: props<{ sessionId: string }>()
  }
});

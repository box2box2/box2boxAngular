import { createFeature, createReducer, on } from '@ngrx/store';
import { LoginResponse } from '../modules/shared/dtos/shared/login.dto';
import { AppActions } from '../store/app.actions';
import { ShopFullDTO } from '../modules/shared/dtosV2/posShop/shopFull.dto';

export interface AppState {
  username: string | null;
  posShopAccount: ShopFullDTO | null;
  token: LoginResponse | null;
  portalSessionContact: string | null;
  sessionId: string | null;
}

export const initialState: AppState = {
  username: null,
  posShopAccount: null,
  token: null,
  portalSessionContact: null,
  sessionId: null
};

export const appFeature = createFeature({
  name: 'appState',
  reducer: createReducer(
    initialState,
    on(AppActions.clear, () => initialState),
    on(AppActions.setUsername, (state, { username }) => ({
      ...state,
      username
    })),
    on(AppActions.setPosShopAccount, (state, { posShopAccount }) => ({
      ...state,
      posShopAccount: posShopAccount as unknown as ShopFullDTO
    })),
    on(AppActions.setToken, (state, { token }) => ({
      ...state,
      token
    })),
    on(AppActions.setPortalSessionContact, (state, { portalSessionContact }) => ({
      ...state,
      portalSessionContact
    })),
    on(AppActions.setSessionId, (state, { sessionId }) => ({
      ...state,
      sessionId
    }))
  )
});

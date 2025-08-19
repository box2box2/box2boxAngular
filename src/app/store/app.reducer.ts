import { createFeature, createReducer, on } from '@ngrx/store';
import { AppActions } from './app.actions';
import { LoginResponse } from '../modules/shared/models/LoginResponse.dto';

export interface AppState {
  token: LoginResponse | null;
}

export const initialState: AppState = {
  token: null
};

export const appFeature = createFeature({
  name: 'appState',
  reducer: createReducer(
    initialState,
    on(AppActions.clear, () => initialState),
    on(AppActions.setToken, (state, { token }) => ({
      ...state,
      token
    }))
  )
});

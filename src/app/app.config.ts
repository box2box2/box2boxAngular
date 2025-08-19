import { localStorageSync } from 'ngrx-store-localstorage';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import {
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { TokenInterceptor } from './modules/shared/auth/interceptors/token.interceptor';
import { ErrorInterceptor } from './modules/shared/auth/interceptors/error.interceptor';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { AuthModule } from './modules/shared/auth/auth.module';
import { DialogModule } from '@angular/cdk/dialog';
import { ArcElement, Chart, PieController } from 'chart.js';
import Encryptor from './services/encryptor';
import { ServiceWorkerModule } from '@angular/service-worker';

const encDec = {
  encrypt: Encryptor.encFunction,
  decrypt: Encryptor.decFunction,
};

// Register chart.js elements (do this outside providers)
Chart.register(PieController, ArcElement);

export function HttpLoaderFactory(): TranslateHttpLoader {
  return new TranslateHttpLoader();
}

// MetaReducers with localStorageSync
import {
  ActionReducer,
  ActionReducerMap,
  MetaReducer,
  provideStore,
} from '@ngrx/store';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { posFeature } from './modules/pos/store/pos.reducer';
import { appFeature } from './store/app.reducer';
import { environment } from '../environments/environment';
export interface AppState {
  appState: ReturnType<typeof appFeature.reducer>;
  posState: ReturnType<typeof posFeature.reducer>;
}
const reducers: ActionReducerMap<AppState> = {
  appState: appFeature.reducer,
  posState: posFeature.reducer,
};
export function localStorageSyncReducer(
  reducer: ActionReducer<AppState>,
): ActionReducer<AppState> {
  return localStorageSync({
    keys: [{ [appFeature.name]: encDec }, { [posFeature.name]: encDec }],
    rehydrate: true,
  })(reducer);
}
export const metaReducers: Array<MetaReducer<AppState>> = [
  localStorageSyncReducer,
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // Angular core and material modules
    provideAnimationsAsync(),
    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline' },
    },

    // HTTP client and interceptors (DI)
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true,
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true,
    },

    // NgRx store with devtools and metaReducers
    provideStore(reducers, {
      metaReducers,
      runtimeChecks: {
        strictActionImmutability: false,
        strictActionSerializability: false,
        strictStateImmutability: false,
        strictStateSerializability: false,
      },
    }),

    // Material and custom modules (standalone-friendly)
    importProvidersFrom(
      // MaterialModule, // FIXME
      // SnackbarModule,
      AuthModule,
      // ProductDetailModule,
      DialogModule,
      // Ngx-translate (i18n)
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
      ServiceWorkerModule.register('ngsw-worker.js', {
        enabled: environment.production,
      }),
    ),
  ],
};

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { PosState } from '../../pos/store/pos.reducer';
import { PosActions } from '../../pos/store/pos.actions';
import { Subject, Observable, first, map } from 'rxjs';
import { UiAction } from '../contracts/UiActions';
import { LoginResponse } from '../dtos/shared/login.dto';
import { MasterDataFullDTO, MasterCompanyFullDTO } from '../dtos/shared/masterData.dto';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { EmployeeFullDTO } from '../dtosV2/employee/employeeFull.dto';
import { AppActions } from '../../../store/app.actions';
import { appFeature, AppState } from '../../../store/app.reducer';
import { environment } from '../../../../environments/environment';
import { AzureGrandTypeEnum } from '../../../enums/grand_type.enum';

@Injectable({
  providedIn: 'root'
})
export class SharedService {
  private _$actionClick: Subject<UiAction> = new Subject();

  constructor(
    protected _http: HttpClient,
    private _posStore: Store<PosState>,
    private _appStore: Store<AppState>,
    private _router: Router
  ) {}

  get $actionClick(): Observable<UiAction> {
    return this._$actionClick.asObservable();
  }

  public emitAction(action: UiAction): void {
    this._$actionClick.next(action);
  }

  clearAllStates(): void {
    this.clearPosState();
    this.clearAppState();
  }

  clearPosState(): void {
    this._posStore.dispatch(PosActions.clear());
  }

  clearAppState(): void {
    this._appStore.dispatch(AppActions.clear());
  }

  getLoginResponse(): Observable<LoginResponse | null> {
    return this._appStore.select(appFeature.selectToken);
  }

  getMasterData<T>(companyId: string, category: string[], selectedAccountId?: string): Observable<MasterDataFullDTO<T>> {
    const conn = `${environment.functionAppUrl}GetMasterData`;
    const payload = {
      SelectedAccountId: selectedAccountId,
      Category: category,
      CompanyId: companyId
    };
    return this._http.post<MasterDataFullDTO<T>>(conn, payload);
  }

  getMasterCompany<T>(companyId: string, category: string[]): Observable<MasterCompanyFullDTO<T>> {
    const conn = `${environment.functionAppUrl}GetMasterCompany`;
    const headers = {
      'X-Calling-Function': 'getMasterCompany'
    };
    return this._http.post<MasterCompanyFullDTO<T>>(conn, { category, companyId }, { headers });
  }

  findEmployeeByNumber(accountNumber: string): Observable<EmployeeFullDTO> {
    const conn = `${environment.functionAppUrl}FindEmployeeByNumber/${accountNumber}`;
    const headers = {
      'X-Calling-Function': 'findEmployeeByNumber'
    };
    return this._http.post<EmployeeFullDTO>(conn, { headers });
  }

  cosmosLogin(username: string, password: string): Observable<LoginResponse> {
    console.log('init cosmosLogin');
    let params = new HttpParams();
    params = params.append('username', username);
    params = params.append('password', password);
    params = params.append('grant_type', AzureGrandTypeEnum.GRANDTYPE_AZURE_PASSWORD);
    params = params.append('client_id', environment.clientId);
    params = params.append('scope', environment.scope);
    const url = `${environment.apiUrlSignIn}/${username}/send`;
    const headers = {
      'X-Calling-Function': 'cosmosLogin'
    };
    return this._http.post<LoginResponse>(url, params, { headers });
  }

  getAppState(): Observable<AppState> {
    console.log('app state is called');
    return this._appStore.select(appFeature.selectAppStateState);
  }

  public isAuthorized(): Observable<boolean> {
    return this.getAppState().pipe(
      first(),
      map(authState => {
        const accessToken = authState?.token?.access_token;
        if (!accessToken) {
          console.warn('[isAuthorized] No access_token found!');
          return false;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let decoded: any;
        try {
          decoded = jwtDecode(accessToken);
          console.log('[isAuthorized] Decoded JWT:', decoded);
        } catch (e) {
          console.error('[isAuthorized] Failed to decode JWT:', e);
          this.logout();
          return false;
        }
        return true;
        // const now = Math.floor(Date.now() / 1000);
        // const exp = decoded.exp;
        // const nbf = decoded.nbf;
        // const iat = decoded.iat;

        // console.log('[isAuthorized] JWT iat:', iat, 'exp:', exp, 'now:', now);

        // if (!exp || now > exp) {
        //   console.warn('[isAuthorized] Token is expired (exp < now). Logging out...');
        //   this.logout();
        //   return false;
        // }
        // if (nbf && now < nbf) {
        //   console.warn('[isAuthorized] Token not valid yet (nbf > now).');
        //   this.logout();
        //   return false;
        // }

        // console.info('[isAuthorized] Token is present and valid.');
        // return true;
      })
    );
  }

  getAccessToken(): Observable<string> {
    return this._appStore.select(appFeature.selectToken).pipe(
      first(),
      map(token => token?.access_token as string)
    );
  }

  logout(): void {
    this.clearAllStates();
    this._router.navigate(['/login']);
  }
}

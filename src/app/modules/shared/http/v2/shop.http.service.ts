import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, map, catchError, combineLatest, first, of, switchMap } from 'rxjs';
import { AccountFilterDTO } from '../../dtos/accountDTO/account-filterDTO';
import { ShopFullDTO } from '../../dtosV2/posShop/shopFull.dto';
import { AccountSimpleDTO } from '../../dtosV2/shared/accountSimple.dto';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { ShopChartDTO } from '../../dtos/charts/shopChart.dto';
import { PosOrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { environment } from '../../../../../environments/environment';
import { PosV2Service } from '../../../pos/services/pos.service';

@Injectable({
  providedIn: 'root'
})
export class ShopHttpService {
  constructor(
    protected _http: HttpClient,
    private _posService: PosV2Service
  ) {}

  getPosShopById(id: string): Observable<ShopFullDTO> {
    const filter: AccountFilterDTO = new AccountFilterDTO();
    filter.Types = ['POS-SHOP'];
    filter.SimpleView = false;
    filter.AccountId = id;
    filter.CompanyId = '';
    // TODO replace with correct url
    const conn = `${environment.functionAppUrl}GetAccounts`;
    const headers = {
      'X-Calling-Function': 'getPosShopById'
    };
    return this._http.post<ShopFullDTO[]>(conn, filter, { headers }).pipe(
      tap(response => console.log('API Response:', response)),
      map(posShops => {
        if (!posShops || posShops.length === 0) {
          throw new Error('No PosShop found for the given ID');
        }
        console.log('Processed Result:', posShops[0]);
        return posShops[0];
      })
    ) as Observable<ShopFullDTO>;
  }

  validateRequiredPosShopCall(): Observable<boolean> {
    return combineLatest([this._posService.getPosShopAccount()]).pipe(
      first(),
      map(([posShopAccount]) => {
        if (!posShopAccount || !posShopAccount.Account.id) {
          console.error('POS Shop Account is required for POS calls');
          return false;
        }
        return true;
      }),
      catchError(error => {
        console.error('Error validating POS calls:', error);
        return of(false);
      })
    );
  }

  getAllPosShop(): Observable<AccountSimpleDTO[]> {
    const filter: AccountFilterDTO = new AccountFilterDTO();
    filter.Types = ['POS-SHOP'];
    filter.SimpleView = true;
    filter.AccountId = null;
    const conn = `${environment.functionAppUrl}GetAccounts`;
    return this._http.post<AccountSimpleDTO[]>(conn, filter);
  }

  getChartDataForShop(): Observable<ShopChartDTO> {
    return this._posService.getPosShopAccount().pipe(
      switchMap(shop => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.CHART; // 8500
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.CHART; // 35
        order.PosShopAccountId = shop.Account.id;
        order.Module = ['POS'];

        const headers = {
          'X-Calling-Function': 'getChartDataForShop'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<ShopChartDTO>(url, order, { headers });
      })
    );
  }
}

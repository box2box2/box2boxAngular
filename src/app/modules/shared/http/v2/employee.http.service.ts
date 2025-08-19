import { HttpClient } from '@angular/common/http';
import { EmployeeFullDTO } from '../../dtosV2/employee/employeeFull.dto';
import { ShopFullDTO } from '../../dtosV2/posShop/shopFull.dto';
import { catchError, EMPTY, Observable, switchMap, take } from 'rxjs';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { AccountFilterDTO } from '../../dtos/accountDTO/account-filterDTO';
import { ShopHttpService } from './shop.http.service';
import { PosOrderDTO } from '../../dtos/posOrder/posOrder.dto';
import { PosOrderSetDTO, OrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { AccountSimpleDTO } from '../../dtosV2/shared/accountSimple.dto';
import { environment } from '../../../../../environments/environment';
import { PosV2Service } from '../../../pos/services/pos.service';
import { MatSnackBar } from '@angular/material/snack-bar';



export class EmployeeHttpService {
  constructor(
    protected _http: HttpClient,
    private _shopHttpService: ShopHttpService,
    private _snackbar: MatSnackBar,
    private _posService: PosV2Service
  ) {}

  getAllEmployees(): Observable<EmployeeFullDTO[]> {
    const filter: AccountFilterDTO = new AccountFilterDTO();
    filter.Types = ['POS-EMPLOYEE'];
    filter.SimpleView = true;
    filter.AccountId = null;

    const headers = {
      'X-Calling-Function': 'getAllEmployees'
    };
    const conn = `${environment.functionAppUrl}GetAccounts`;

    return this._http.post<EmployeeFullDTO[]>(conn, filter, { headers });
  }

  setUserSlot(posShopId: string, statusKey: string, employeeId: string, buttonId: string): Observable<ShopFullDTO> {
    return this._shopHttpService.validateRequiredPosShopCall().pipe(
      take(1),
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for setting user slot');
          this._snackbar.open('Required fields are missing for setting user slot');
          return EMPTY;
        }

        const payload = {
          EventId: PosOrderEventEnum.CLOCK_USER,
          ReturnTypeEventId: PosOrderReturnTypeEnum.POS_SHOP,
          EmployeeId: employeeId,
          PosShopAccountId: posShopId,
          StatusKey: statusKey,
          Number: buttonId
        };

        const headers = {
          'X-Calling-Function': 'setUserSlot'
        };
        const conn = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<ShopFullDTO>(conn, payload, { headers });
      })
    );
  }

  clockUserOut(posShopId: string, employeeId: string): Observable<ShopFullDTO> {
    return this._shopHttpService.validateRequiredPosShopCall().pipe(
      take(1),
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for setting user slot');
          this._snackbar.open('Required fields are missing for setting user slot');
          return EMPTY;
        }

        const payload = {
          EventId: PosOrderEventEnum.CLOCK_USER_OUT, // 110
          ReturnTypeEventId: PosOrderReturnTypeEnum.POS_SHOP, // 75
          EmployeeId: employeeId,
          PosShopAccountId: posShopId
        };

        const headers = {
          'X-Calling-Function': 'clockUserOut'
        };
        const conn = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<ShopFullDTO>(conn, payload, { headers });
      })
    );
  }

  updateEmployeeForOrder(orderNumber: string, newEmployee: AccountSimpleDTO): Observable<PosOrderDTO> {
    return this._posService.getPosShopAccount().pipe(
      switchMap(posShopAccount => {
        if (!posShopAccount) {
          console.error('No POS shop account found.');
          return EMPTY;
        }

        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.EMPLOYEE_UPDATE; // 8600
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
        order.Order = new OrderSetDTO();
        order.Order.Number = orderNumber;
        order.EmployeeId = newEmployee.id;
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Module = ['POS'];

        const headers = {
          'X-Calling-Function': 'updateEmployee'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<PosOrderDTO>(url, order, { headers });
      }),
      catchError(err => {
        console.error('Error while updating the employee for order:', err);
        return EMPTY;
      })
    );
  }
}

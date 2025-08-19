import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { catchError, combineLatest, EMPTY, first, Observable, switchMap, tap } from 'rxjs';
import { OrderSetDTO, PosOrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { PosOrderDTO } from '../../dtos/posOrder/posOrder.dto';
import { PosOrderlineSetDTO } from '../../dtos/posOrderSet/posOrderlineSet.dto';
import { OrderHttpService } from './order.http.service';
import { environment } from '../../../../../environments/environment';
import { PosV2Service } from '../../../pos/services/pos.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class OrderlineHttpService {
  constructor(
    protected _http: HttpClient,
    private _snackbar: MatSnackBar,
    private _posService: PosV2Service,
    private _orderHttpService: OrderHttpService
  ) {}

  scanPosOrderline(event: PosOrderEventEnum, orderNumber: string, line?: PosOrderlineSetDTO): Observable<PosOrderDTO> {
    return this._orderHttpService.validateRequiredFieldsPosCalls(true).pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for processPosOrderline');
          this._snackbar.open('Required fields are missing for processPosOrderline');
          return EMPTY; // Stops execution if validation fails
        }

        // Proceed with processing the order line
        return combineLatest([
          this._posService.getSelectedEmployee(),
          this._posService.getPosShopAccount(),
          this._posService.getSelectedTerminal()
        ]).pipe(
          first(),
          switchMap(([employee, posShopAccount, terminal]) => {
            console.log('Selected employee:', employee);
            console.log('Logged-in account:', posShopAccount);
            console.log('Selected terminal:', terminal);

            // Create order object
            const order: PosOrderSetDTO = new PosOrderSetDTO();
            order.EventId = event;
            order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
            order.Order = new OrderSetDTO();
            order.Order.Number = orderNumber;
            order.EmployeeId = employee?.id as string;
            order.AccountId = posShopAccount.Account.id;
            order.PosShopAccountId = posShopAccount.Account.id;
            order.PosShopTerminalId = terminal?.Account.id ?? '';
            order.Payment = [];
            order.Module = ['POS'];

            if (line) {
              order.OrderLines = [line];
            }

            console.log('Final Order Object:', order);

            const url = `${environment.functionAppUrl}ScanOrderline`;
            const headers = {
              'X-Calling-Function': 'ScanOrderline'
            };

            return this._http.post<PosOrderDTO>(url, order, { headers }).pipe(
              tap(response => {
                console.log('Response received from server:', response);
              }),
              catchError(err => {
                console.error('Error while processing order line:', err);
                return EMPTY;
              })
            );
          })
        );
      })
    );
  }

  processPosOrderline(event: PosOrderEventEnum, orderNumber: string, line?: PosOrderlineSetDTO): Observable<PosOrderDTO> {
    return this._orderHttpService.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return EMPTY; // Stops execution if the order can't be processed
        }

        // Proceed with validating required fields
        return this._orderHttpService.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for processPosOrderline');
              this._snackbar.open('Required fields are missing for processPosOrderline');
              return EMPTY;
            }

            return combineLatest([
              this._posService.getSelectedEmployee(),
              this._posService.getPosShopAccount(),
              this._posService.getSelectedTerminal()
            ]).pipe(
              first(),
              switchMap(([employee, posShopAccount, terminal]) => {
                console.log('Selected employee:', employee);
                console.log('Logged-in account:', posShopAccount);
                console.log('Selected terminal:', terminal);

                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = event;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.EmployeeId = employee?.id as string;
                order.AccountId = posShopAccount.Account.id;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.PosShopTerminalId = terminal?.Account.id ?? '';
                order.Payment = [];
                order.Module = ['POS'];

                if (line) {
                  order.OrderLines = [line];
                }

                console.log('Final Order Object:', order);

                const url = `${environment.functionAppUrl}PosOrderActivity`;
                const headers = {
                  'X-Calling-Function': 'processPosOrderline'
                };

                return this._http.post<PosOrderDTO>(url, order, { headers }).pipe(
                  tap(response => {
                    console.log('Response received from server:', response);
                  }),
                  catchError(err => {
                    console.error('Error while processing order line:', err);
                    return EMPTY;
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in order processing:', err);
        return EMPTY; // Stops execution on error
      })
    );
  }

  processPurPosOrderline(event: PosOrderEventEnum, orderNumber: string, line?: PosOrderlineSetDTO): Observable<PosOrderDTO> {
    return this._orderHttpService.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return EMPTY; // Stops execution if the order can't be processed
        }

        // Proceed with validating required fields
        return this._orderHttpService.validateRequiredFieldsGetOrdersCall().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for processPosOrderline');
              this._snackbar.open('Required fields are missing for processPosOrderline');
              return EMPTY; // Stops execution if validation fails
            }

            // Proceed with processing the order line
            return combineLatest([
              this._posService.getSelectedEmployee(),
              this._posService.getPosShopAccount(),
              this._posService.getSelectedTerminal()
            ]).pipe(
              first(),
              switchMap(([employee, posShopAccount, terminal]) => {
                console.log('Selected employee:', employee);
                console.log('Logged-in account:', posShopAccount);
                console.log('Selected terminal:', terminal);

                // Create order object
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = event;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.EmployeeId = employee?.id as string;
                order.AccountId = posShopAccount.Account.id;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.PosShopTerminalId = terminal?.Account.id ?? '';
                order.Payment = [];
                order.Module = ['POS'];

                if (line) {
                  order.OrderLines = [line];
                }

                console.log('Final Order Object:', order);

                const url = `${environment.functionAppUrl}PosOrderActivity`;
                const headers = {
                  'X-Calling-Function': 'processPosPurOrderline'
                };

                return this._http.post<PosOrderDTO>(url, order, { headers }).pipe(
                  tap(response => {
                    console.log('Response received from server:', response);
                  }),
                  catchError(err => {
                    console.error('Error while processing order line:', err);
                    return EMPTY;
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in order processing:', err);
        return EMPTY;
      })
    );
  }

  deleteOrderline(orderNumber: string, orderline: PosOrderlineSetDTO): Observable<PosOrderDTO> {
    return this._orderHttpService.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return EMPTY;
        }

        return this._orderHttpService.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for deleting order line');
              this._snackbar.open('Required fields are missing for deleting order line');
              return EMPTY;
            }

            return this._posService.getPosShopAccount().pipe(
              first(),
              switchMap(posShopAccount => {
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.ORDERLINE_DELETE;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.OrderLines = [orderline];
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'deleteOrderline'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<PosOrderDTO>(url, order, { headers }).pipe(
                  catchError(err => {
                    console.error('Error while deleting the order line:', err);
                    return EMPTY;
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order line deletion:', err);
        return EMPTY;
      })
    );
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap, EMPTY, first, combineLatest, tap, forkJoin } from 'rxjs';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderIndicatorEnum } from '../../data/enums/posOrderIndicator.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { PosOrderStatusEnum } from '../../data/enums/posOrderStatus.enum';
import { PosOrderDTO } from '../../dtos/posOrder/posOrder.dto';
import { PosOrderSetDTO, OrderSetDTO, PosOrderReturnDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { TerminalFullDTO } from '../../dtosV2/posTerminal/terminalFull.dto';
import { ShopFullDTO } from '../../dtosV2/posShop/shopFull.dto';
import { EmployeeFullDTO } from '../../dtosV2/employee/employeeFull.dto';
import { TerminalHttpService } from './terminal.http.service';
import { AccountSimpleDTO } from '../../dtosV2/shared/accountSimple.dto';
import { PosOrderlineDTO } from '../../dtos/posOrder/posOrderline.dto';
import { PosPaymentDTO } from '../../dtos/shared/payment.dto';
import { environment } from '../../../../../environments/environment';
import { DateService } from '../../../../services/date-util.services';
import { PosV2Service } from '../../../pos/services/pos.service';
import { PosActions } from '../../../pos/store/pos.actions';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class OrderHttpService {
  constructor(
    protected _http: HttpClient,
    private _snackbar: MatSnackBar,
    private _posService: PosV2Service,
    private _terminalHttpService: TerminalHttpService
  ) {}

  checkIfOrderCanBeProcessed(orderNumber: string): Observable<boolean> {
    return this.getPosOrderByOrderNumber(orderNumber).pipe(
      map(order => {
        // Check if the order exists and if the status is valid
        const canBeProcessed =
          !!order &&
          (order.Order.Status.Key === PosOrderStatusEnum.NEW_ORDER ||
            order.Order.Status.Key === PosOrderStatusEnum.PAUSED_ORDER ||
            order.Order.Status.Key === PosOrderStatusEnum.WAITING_FOR_PAYMENT ||
            order.Order.Status.Key === PosOrderStatusEnum.FUTURE_ORDER ||
            order.Order.Indicator?.Key === PosOrderIndicatorEnum.REFUND);

        if (!canBeProcessed) {
          console.error('Order cannot be processed due to invalid status.', order.Order.Status.Key, order.Order.Number);
          this._snackbar.open('Order cannot be processed due to invalid status.');
        }
        return canBeProcessed;
      }),
      catchError(err => {
        console.error('Error fetching order:', err);
        this._snackbar.open('Error fetching order. Please try again.');
        return of(false);
      })
    );
  }

  getPosOrderByOrderNumber(orderNumber: string): Observable<PosOrderDTO> {
    return this.validateRequiredFieldsGetOrdersCall().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for getting orders');
          this._snackbar.open('Required fields are missing for getting orders');
          return EMPTY; // Stop execution if validation fails
        }
        return this._posService.getPosShopAccount().pipe(
          first(),
          switchMap(posShopAccount => {
            const order: PosOrderSetDTO = new PosOrderSetDTO();
            order.EventId = PosOrderEventEnum.ORDER_GET_BY_NUMBER;
            order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
            order.PosShopAccountId = posShopAccount.Account.id;
            const ordObj: OrderSetDTO = new OrderSetDTO();
            ordObj.Number = orderNumber;
            order.Order = ordObj;
            order.Module = ['POS'];
            const headers = {
              'X-Calling-Function': 'getPosOrderByOrderNumber'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;
            return this._http.post<PosOrderDTO>(url, order, { headers });
          })
        );
      })
    );
  }

  validateRequiredFieldsGetOrdersCall(): Observable<boolean> {
    return combineLatest([this._posService.getPosShopAccount(), this._posService.getSelectedTerminal()]).pipe(
      first(),
      map(([posShopAccount, terminal]) => {
        if (!posShopAccount || !posShopAccount.Account.id) {
          console.error('POS Shop Account is required for POS calls');
          return false;
        }
        if (!terminal || !terminal.Account.id) {
          console.error('POS Terminal is required for POS calls');
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

  createEmptyOrder(): Observable<PosOrderDTO> {
    return this.validateRequiredFieldsPosCalls().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Validation failed: Required fields are missing for creating an empty order');
          return EMPTY; // Exit early if validation fails
        }
        return combineLatest([
          this._posService.getSelectedEmployee(),
          this._posService.getPosShopAccount(),
          this._posService.getSelectedTerminal()
        ]).pipe(
          first(),
          switchMap(([employee, posShopAccount, terminal]) => {
            console.log('Account:', posShopAccount);
            console.log('Selected employee:', employee);
            console.log('Selected terminal:', terminal);

            // Create the new order object
            const newOrder: PosOrderSetDTO = new PosOrderSetDTO();
            newOrder.EventId = PosOrderEventEnum.ORDER_CREATE;
            newOrder.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;

            const order: OrderSetDTO = new OrderSetDTO();
            order.Number = '';
            (order.DeliveryDate = DateService.getNowUtc()), (newOrder.Order = order);

            newOrder.Notes = '';
            newOrder.EmployeeId = employee?.id as string;
            newOrder.PosShopAccountId = posShopAccount.Account.id;
            newOrder.PosShopTerminalId = terminal?.Account.id ?? '';
            newOrder.AccountId = posShopAccount.Account.id;
            newOrder.Payment = [];
            newOrder.OrderLines = [];
            newOrder.Module = ['POS'];

            console.log('CreateEmptyPosOrder', newOrder);

            const headers = {
              'X-Calling-Function': 'createEmptyOrder'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO>(url, newOrder, { headers });
          })
        );
      })
    );
  }

  validateRequiredFieldsPosCalls(ignoreCashflowCheck = false): Observable<boolean> {
    const baseObservables = [
      this._posService.getSelectedEmployee(),
      this._posService.getPosShopAccount(),
      this._posService.getSelectedTerminal()
    ];

    const observables = ignoreCashflowCheck ? [...baseObservables, of(true)] : [...baseObservables, this.validateCashFlow()];

    return combineLatest(
      observables as [
        Observable<EmployeeFullDTO | undefined>,
        Observable<ShopFullDTO | undefined>,
        Observable<TerminalFullDTO | undefined>,
        Observable<boolean>
      ]
    ).pipe(
      first(),
      map(([employee, posShopAccount, terminal, activeCashflow]) => {
        if (!employee || !employee.Account.id) {
          console.error('Employee is required for POS calls');
          return false;
        }
        if (!posShopAccount || !posShopAccount.Account.id) {
          console.error('POS Shop Account is required for POS calls');
          return false;
        }
        if (!terminal || !terminal.Account.id) {
          console.error('POS Terminal is required for POS calls');
          return false;
        }
        if (!ignoreCashflowCheck && !activeCashflow) {
          console.error('Kassa is gesloten, geen cashflow mogelijk.');
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

  validateCashFlow(): Observable<boolean> {
    return this._posService.getSelectedTerminal().pipe(
      first(),
      switchMap(terminal => {
        if (terminal) {
          return this._terminalHttpService.getTerminalById(terminal.Account.id).pipe(
            first(),
            tap(updatedTerminal => {
              this._posService.dispatchPosAction(PosActions.setTerminal({ terminal: updatedTerminal }));
            }),
            map(updatedTerminal => {
              //TODO how to validate if the drawer is open?
              console.log('Updated Terminal:', updatedTerminal);
              return true;
              // if (updatedTerminal && updatedTerminal.DrawerStatus && updatedTerminal.DrawerStatus.Key === '10') {
              //   return true;
              // } else {
              //   this._snackbar.open('Kassa is gesloten, geen cashflow mogelijk.');
              //   return false;
              // }
            })
          );
        } else {
          return of(false);
        }
      })
    );
  }

  validateRequiredFieldsPosCallsReturn(): Observable<boolean> {
    return combineLatest([this._posService.getPosShopAccount(), this._posService.getSelectedTerminal()]).pipe(
      first(),
      map(([posShopAccount, terminal]) => {
        if (!posShopAccount || !posShopAccount.Account.id) {
          console.error('POS Shop Account is required for POS calls');
          return false;
        }
        if (!terminal || !terminal.Account.id) {
          console.error('POS Terminal is required for POS calls');
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

  createEmptyDervingOrder(orderDate: Date, posShop: AccountSimpleDTO): Observable<PosOrderDTO> {
    return this.validateRequiredFieldsGetOrdersCall().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Validation failed: Required fields are missing for creating an empty order');
          return EMPTY;
        }
        return combineLatest([
          this._posService.getSelectedEmployee(),
          this._posService.getPosShopAccount(),
          this._posService.getSelectedTerminal()
        ]).pipe(
          first(),
          switchMap(([employee, posShopAccount, terminal]) => {
            console.log('Account:', posShopAccount);
            console.log('Selected employee:', employee);
            console.log('Selected terminal:', terminal);

            // Create the new order object
            const newOrder: PosOrderSetDTO = new PosOrderSetDTO();
            newOrder.EventId = PosOrderEventEnum.ORDER_CREATE;
            newOrder.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;

            const order: OrderSetDTO = new OrderSetDTO();
            order.Number = '';
            order.DeliveryDate = orderDate ?? DateService.getNowUtc();
            newOrder.Order = order;

            newOrder.Notes = '';
            newOrder.EmployeeId = employee?.id as string;
            newOrder.PosShopAccountId = posShop.id ?? posShopAccount.Account.id;
            newOrder.PosShopTerminalId = terminal?.Account.id ?? '';
            newOrder.AccountId = posShopAccount.Account.id;
            newOrder.Payment = [];
            newOrder.OrderLines = [];
            newOrder.Module = ['DERVING'];

            console.log('createEmptyDervingOrder', newOrder);

            const headers = {
              'X-Calling-Function': 'createEmptyDervingOrder'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO>(url, newOrder, { headers });
          })
        );
      })
    );
  }

  createEmptyPurOrder(orderDate: Date, posShop: AccountSimpleDTO): Observable<PosOrderDTO> {
    return this.validateRequiredFieldsGetOrdersCall().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Validation failed: Required fields are missing for creating an empty order');
          return EMPTY; // Exit early if validation fails
        }
        return combineLatest([
          this._posService.getSelectedEmployee(),
          this._posService.getPosShopAccount(),
          this._posService.getSelectedTerminal()
        ]).pipe(
          first(),
          switchMap(([employee, posShopAccount, terminal]) => {
            console.log('Account:', posShopAccount);
            console.log('Selected employee:', employee);
            console.log('Selected terminal:', terminal);

            // Create the new order object
            const newOrder: PosOrderSetDTO = new PosOrderSetDTO();
            newOrder.EventId = PosOrderEventEnum.ORDER_CREATE;
            newOrder.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;

            const order: OrderSetDTO = new OrderSetDTO();
            order.Number = '';
            order.DeliveryDate = orderDate ?? DateService.getNowUtc();
            newOrder.Order = order;

            newOrder.Notes = '';
            newOrder.EmployeeId = employee?.id as string;
            newOrder.PosShopAccountId = posShop.id ?? posShopAccount.Account.id;
            newOrder.PosShopTerminalId = terminal?.Account.id ?? '';
            newOrder.AccountId = posShopAccount.Account.id;
            newOrder.Payment = [];
            newOrder.OrderLines = [];
            newOrder.Module = ['PUR'];

            console.log('CreateEmptyPosOrder', newOrder);

            const headers = {
              'X-Calling-Function': 'createEmptyPurOrder'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO>(url, newOrder, { headers });
          })
        );
      })
    );
  }

  getPosOrders(): Observable<PosOrderDTO[]> {
    return this.validateRequiredFieldsPosCalls().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for getting orders');
          this._snackbar.open('Required fields are missing for getting orders');
          return EMPTY;
        }

        return combineLatest([this._posService.getSelectedEmployee(), this._posService.getPosShopAccount()]).pipe(
          first(),
          switchMap(([employee, posShopAccount]) => {
            if (!employee) {
              console.error('No employee selected for fetching orders.');
              this._snackbar.open('No employee selected for fetching orders.');
              return EMPTY;
            }

            const order: PosOrderSetDTO = new PosOrderSetDTO();
            order.EventId = PosOrderEventEnum.ORDER_OPEN;
            order.ReturnTypeEventId = PosOrderReturnTypeEnum.ALL_POS_ORDERS;
            order.PosShopAccountId = posShopAccount.Account.id;
            order.EmployeeId = employee.id;
            order.Module = ['POS'];

            const headers = {
              'X-Calling-Function': 'getPosOrders'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO[]>(url, order, { headers }).pipe(
              tap(orders => {
                if (!orders || orders.length === 0) {
                  console.warn('No orders found.');
                } else {
                  console.log('Orders fetched successfully:', orders);
                }
              }),
              catchError(err => {
                console.error('Error fetching POS orders:', err);
                this._snackbar.open('Error fetching POS orders.');
                return of([]);
              })
            );
          })
        );
      })
    );
  }

  getDervingOrders(selectedShop?: AccountSimpleDTO): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.ALL_POS_ORDERS;
        order.PosShopAccountId = selectedShop?.id ?? posShopAccount.Account.id;
        order.Module = ['DERVING'];

        const headers = {
          'X-Calling-Function': 'getPosDervingOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<PosOrderDTO[]>(url, order, { headers }).pipe(
          tap(orders => {
            if (!orders || orders.length === 0) {
              console.warn('No orders found.');
            } else {
              console.log('Orders fetched successfully:', orders);
            }
          }),
          catchError(err => {
            console.error('Error fetching POS orders:', err);
            this._snackbar.open('Error fetching POS orders.');
            return of([]);
          })
        );
      })
    );
  }

  getPurOrders(selectedShop?: AccountSimpleDTO): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.ALL_POS_ORDERS;
        order.PosShopAccountId = selectedShop?.id ?? posShopAccount.Account.id;
        order.Module = ['PUR'];

        const headers = {
          'X-Calling-Function': 'getPosPurOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<PosOrderDTO[]>(url, order, { headers }).pipe(
          tap(orders => {
            if (!orders || orders.length === 0) {
              console.warn('No orders found.');
            } else {
              console.log('Orders fetched successfully:', orders);
            }
          }),
          catchError(err => {
            console.error('Error fetching POS orders:', err);
            this._snackbar.open('Error fetching POS orders.');
            return of([]);
          })
        );
      })
    );
  }

  getClosedOrders(): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_CLOSED_ORDERS;
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Module = ['POS'];

        const headers = {
          'X-Calling-Function': 'getClosedOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;
        return this._http.post<PosOrderDTO[]>(url, order, { headers });
      })
    );
  }

  getAllOrders(selecteDate: Date): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_ALL_ORDERS; // 60
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Module = ['POS', 'PUR'];
        const ordObj: OrderSetDTO = new OrderSetDTO();
        ordObj.OrderedDate = selecteDate;
        order.Order = ordObj;
        const headers = {
          'X-Calling-Function': 'getAllOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;
        return this._http.post<PosOrderDTO[]>(url, order, { headers });
      })
    );
  }

  getPausedPosOrders(): Observable<PosOrderDTO[]> {
    return this.validateRequiredFieldsPosCalls().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Required fields are missing for getting paused orders');
          this._snackbar.open('Required fields are missing for getting orders');
          return EMPTY; // Stop execution if validation fails
        }

        return combineLatest([
          this._posService.getSelectedEmployee(),
          this._posService.getPosShopAccount(),
          this._posService.getSelectedTerminal()
        ]).pipe(
          first(),
          switchMap(([employee, posShopAccount, terminal]) => {
            console.log('Account:', posShopAccount);
            console.log('Selected employee:', employee);
            console.log('Selected terminal:', terminal);

            const order: PosOrderSetDTO = new PosOrderSetDTO();
            order.EventId = PosOrderEventEnum.GET_ORDER_PAUSE;
            order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_PAUSED_ORDERS;
            order.PosShopAccountId = posShopAccount.Account.id;
            order.EmployeeId = employee?.id as string;
            order.PosShopTerminalId = terminal?.Account.id ?? '';
            order.AccountId = posShopAccount.Account.id;
            order.Module = ['POS'];
            console.log('getPausedPosOrders');

            const headers = {
              'X-Calling-Function': 'getPausedPosOrders'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO[]>(url, order, { headers });
          })
        );
      })
    );
  }

  completeOrder(orderNumber: string): Observable<boolean> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return of(false);
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for completing order');
              this._snackbar.open('Required fields are missing for completing order');
              return of(false);
            }

            return this._posService.getPosShopAccount().pipe(
              first(),
              switchMap(posShopAccount => {
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.ORDER_COMPLETE;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'completeOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<boolean>(url, order, { headers });
              }),
              catchError(err => {
                console.error('Error while completing the order:', err);
                return of(false);
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order:', err);
        return of(false);
      })
    );
  }

  completePurOrder(orderNumber: string): Observable<boolean> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_COMPLETE;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Order = new OrderSetDTO();
        order.Order.Number = orderNumber;
        order.Module = ['PUR'];

        const headers = {
          'X-Calling-Function': 'completeOrder'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<boolean>(url, order, { headers });
      }),
      catchError(err => {
        console.error('Error while completing the order:', err);
        return of(false);
      }),
      catchError(err => {
        console.error('Error in processing order:', err);
        return of(false);
      })
    );
  }

  completeDervingOrder(orderNumber: string): Observable<boolean> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_COMPLETE;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Order = new OrderSetDTO();
        order.Order.Number = orderNumber;
        order.Module = ['DERVING'];

        const headers = {
          'X-Calling-Function': 'completeDervingOrder'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<boolean>(url, order, { headers });
      }),
      catchError(err => {
        console.error('Error while completing the order:', err);
        return of(false);
      }),
      catchError(err => {
        console.error('Error in processing order:', err);
        return of(false);
      })
    );
  }

  deleteOrder(orderNumber: string): Observable<boolean> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return of(false);
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for deleting order');
              this._snackbar.open('Required fields are missing for deleting order');
              return of(false);
            }

            return this._posService.getPosShopAccount().pipe(
              first(),
              switchMap(posShopAccount => {
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.ORDER_DELETE;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'deleteOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<boolean>(url, order, { headers });
              }),
              catchError(err => {
                console.error('Error while deleting the order:', err);
                return of(false);
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order deletion:', err);
        return of(false);
      })
    );
  }

  pausePosOrder(orderNumber: string, name?: string): Observable<boolean> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return of(false);
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for pausing order');
              this._snackbar.open('Required fields are missing for pausing order');
              return of(false);
            }

            return this._posService.getPosShopAccount().pipe(
              first(),
              switchMap(posShopAccount => {
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.ORDER_PAUSE;
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.Notes = name ?? 'Paused order';
                order.Order.Notes = name ?? 'Paused order';

                order.Order.OrderedDate = DateService.getNowUtc();
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'pausePosOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<boolean>(url, order, { headers }).pipe(
                  catchError(err => {
                    console.error('Error while pausing the order:', err);
                    return of(false);
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order pause:', err);
        return of(false);
      })
    );
  }

  orderDiscount(discount: number, orderNumber: string): Observable<PosOrderDTO> {
    return combineLatest([this._posService.getPosShopAccount(), this._posService.getSelectedTerminal()]).pipe(
      first(),
      switchMap(([posShopAccount, selectedTerminal]) => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.DISCOUNT; // 5000
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER; // 100
        order.PosShopAccountId = posShopAccount?.Account.id || '';
        order.AccountId = posShopAccount?.Account.id || '';
        order.PosShopTerminalId = selectedTerminal?.Account.id || '';
        order.Payment = [];
        order.OrderLines = [];
        const ord: OrderSetDTO = new OrderSetDTO();
        ord.Number = orderNumber;
        order.Order = ord;
        order.DiscountPercentage = discount ?? 1;

        const headers = {
          'X-Calling-Function': 'orderDiscount'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<PosOrderDTO>(url, order, { headers });
      })
    );
  }

  getFutureOrders(): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL; // 8000
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_FUTURE_ORDERS; // 55
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Module = ['POS'];

        const headers = {
          'X-Calling-Function': 'getFutureOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;
        return this._http.post<PosOrderDTO[]>(url, order, { headers });
      })
    );
  }

  patchOrder(order: PosOrderDTO): Observable<PosOrderDTO> {
    return this.checkIfOrderCanBeProcessed(order.Order.Number).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return EMPTY;
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for completing order');
              this._snackbar.open('Required fields are missing for completing order');
              return EMPTY;
            }

            return combineLatest([
              this._posService.getSelectedEmployee(),
              this._posService.getPosShopAccount(),
              this._posService.getSelectedTerminal()
            ]).pipe(
              first(),
              switchMap(([employee, posShopAccount, terminal]) => {
                console.log('Account:', posShopAccount);
                console.log('Selected employee:', employee);
                console.log('Selected terminal:', terminal);

                const headers = {
                  'X-Calling-Function': 'PatchPosOrder'
                };
                const payload = {
                  OrderedDate: order.Order.OrderedDate,
                  Notes: order.Order.Notes,
                  Status: order.Order.Status
                };
                const url = `${environment.functionAppUrl}PatchPosOrder/${order.id}`;

                return this._http.patch<PosOrderDTO>(url, payload, { headers }).pipe(
                  catchError(err => {
                    console.error('Error patchOrder:', err);
                    return EMPTY;
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error patchOrder:', err);
        return EMPTY;
      })
    );
  }

  processReturnItems(orderlines: PosOrderlineDTO[], employee: EmployeeFullDTO, orderNumber: string): Observable<PosOrderDTO> {
    return this.validateRequiredFieldsPosCallsReturn().pipe(
      switchMap(isValid => {
        if (!isValid) {
          console.error('Validation failed: Required fields are missing for processReturnItems');
          return EMPTY;
        }
        return combineLatest([this._posService.getPosShopAccount(), this._posService.getSelectedTerminal()]).pipe(
          first(),
          switchMap(([posShopAccount, terminal]) => {
            console.log('Account:', posShopAccount);
            console.log('Selected terminal:', terminal);

            // Create the new order object
            const returnOrder: PosOrderReturnDTO = new PosOrderReturnDTO();
            returnOrder.EventId = PosOrderEventEnum.ORDER_RETURN;
            returnOrder.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;

            const order: OrderSetDTO = new OrderSetDTO();
            order.Number = orderNumber;
            (order.DeliveryDate = DateService.getNowUtc()), (returnOrder.Order = order);

            returnOrder.Notes = '';
            returnOrder.EmployeeId = employee?.Account.id as string;
            returnOrder.PosShopAccountId = posShopAccount.Account.id;
            returnOrder.PosShopTerminalId = terminal?.Account.id ?? '';
            returnOrder.AccountId = posShopAccount.Account.id;
            returnOrder.Payment = [];
            returnOrder.OrderLines = orderlines;
            returnOrder.Module = ['POS'];

            console.log('processReturnItems', returnOrder);

            const headers = {
              'X-Calling-Function': 'processReturnItems'
            };
            const url = `${environment.functionAppUrl}PosOrderActivity`;

            return this._http.post<PosOrderDTO>(url, returnOrder, { headers });
          })
        );
      })
    );
  }

  updateUnpaidOrder(orderNumber: string): Observable<boolean> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return of(false);
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for completing order');
              this._snackbar.open('Required fields are missing for completing order');
              return of(false);
            }

            return forkJoin({
              employee: this._posService.getSelectedEmployee().pipe(first()),
              posShopAccount: this._posService.getPosShopAccount().pipe(first())
            }).pipe(
              switchMap(({ employee, posShopAccount }) => {
                if (!employee) {
                  console.error('No employee selected.');
                  this._snackbar.open('No employee selected.');
                  return of(false);
                }

                console.log('Selected employee:', employee);

                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.UPDATE_UNPAID_ORDER; // 8800
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.EmployeeId = employee.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'updateUnpaidOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<boolean>(url, order, { headers }).pipe(
                  catchError(err => {
                    console.error('Error while completing the order:', err);
                    return of(false);
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order:', err);
        return of(false);
      })
    );
  }

  payLaterOrder(orderNumber: string): Observable<boolean> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return of(false);
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for deleting order');
              this._snackbar.open('Required fields are missing for deleting order');
              return of(false);
            }

            return this._posService.getPosShopAccount().pipe(
              first(),
              switchMap(posShopAccount => {
                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.PAY_LATER_ORDER; // 8700
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'payLaterOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<boolean>(url, order, { headers });
              }),
              catchError(err => {
                console.error('Error while deleting the order:', err);
                return of(false);
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing order deletion:', err);
        return of(false);
      })
    );
  }

  getUnpaidOrders(): Observable<PosOrderDTO[]> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.ORDER_GET_ALL;
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_UNPAID_ORDERS; // 30
        order.PosShopAccountId = posShopAccount.Account.id;
        order.Module = ['POS'];

        const headers = {
          'X-Calling-Function': 'getUnpaidOrders'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;
        return this._http.post<PosOrderDTO[]>(url, order, { headers });
      })
    );
  }

  addPaymentToOrder(orderNumber: string, payment: PosPaymentDTO[]): Observable<PosOrderDTO> {
    return this.checkIfOrderCanBeProcessed(orderNumber).pipe(
      switchMap(canBeProcessed => {
        if (!canBeProcessed) {
          console.error('Order cannot be processed.');
          this._snackbar.open('Order cannot be processed.');
          return EMPTY;
        }

        return this.validateRequiredFieldsPosCalls().pipe(
          switchMap(isValid => {
            if (!isValid) {
              console.error('Required fields are missing for completing order');
              this._snackbar.open('Required fields are missing for completing order');
              return EMPTY;
            }

            return combineLatest([
              this._posService.getSelectedEmployee(),
              this._posService.getPosShopAccount(),
              this._posService.getSelectedTerminal()
            ]).pipe(
              first(),
              switchMap(([employee, posShopAccount, terminal]) => {
                console.log('Account:', posShopAccount);
                console.log('Selected employee:', employee);
                console.log('Selected terminal:', terminal);

                const order: PosOrderSetDTO = new PosOrderSetDTO();
                order.EventId = PosOrderEventEnum.PAYMENT_CREATE; // 3050
                order.ReturnTypeEventId = PosOrderReturnTypeEnum.POS_ORDER;
                order.PosShopAccountId = posShopAccount.Account.id;
                order.Order = new OrderSetDTO();
                order.Order.Number = orderNumber;
                order.AccountId = posShopAccount.Account.id;
                order.EmployeeId = employee?.id as string;
                order.PosShopTerminalId = terminal?.Account.id ?? '';
                order.Payment = payment;
                order.Module = ['POS'];

                const headers = {
                  'X-Calling-Function': 'addPaymentToOrder'
                };
                const url = `${environment.functionAppUrl}PosOrderActivity`;

                return this._http.post<PosOrderDTO>(url, order, { headers }).pipe(
                  catchError(err => {
                    console.error('Error while adding payment to the order:', err);
                    return EMPTY;
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('Error in processing payment addition:', err);
        return EMPTY;
      })
    );
  }
}

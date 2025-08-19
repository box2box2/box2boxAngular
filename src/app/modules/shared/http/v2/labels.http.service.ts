import { HttpClient } from '@angular/common/http';
import { Observable, take, switchMap, of, first } from 'rxjs';
import { PosAssortmentItemDTO } from '../../dtos/assortment/assortmentItem.dto';
import { PosOrderDTO } from '../../dtos/posOrder/posOrder.dto';
import { PosOrderDrawerDTO, PosOrderRecieptDTO } from '../../dtos/posOrderSet/posOrderReciept.dto';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { PosOrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { environment } from '../../../../../environments/environment';
import { PosV2Service } from '../../../pos/services/pos.service';

export class LabelsHttpService {
  constructor(
    protected _http: HttpClient,
    private _posService: PosV2Service
  ) {}

  printLabels(item: PosAssortmentItemDTO, quantity: number, date: Date): Observable<boolean> {
    return this._posService.getSelectedTerminal().pipe(
      take(1),
      switchMap(terminal =>
        this._posService.getPosShopAccount().pipe(
          take(1),
          switchMap(posShopAccount => {
            if (!terminal || !posShopAccount) return of(false);

            const labelSettings = terminal.Settings.find(s => s.Key === '991'); // Label printer

            if (!labelSettings) return of(false);

            const body = {
              IpAddress: labelSettings.IpAddress,
              Port: labelSettings.Port,
              Date: date,
              Item: item,
              Amount: quantity ?? 1
            };

            const headers = {
              'X-Calling-Function': `printLabels: ${quantity}`
            };

            const url = `${environment.functionAppUrl}PosItemPrintLabel/${terminal.Account.id}`;
            return this._http.post<boolean>(url, body, { headers });
          })
        )
      )
    );
  }

  reprintReceipt(order: PosOrderDTO, amount?: number): Observable<boolean> {
    return this._posService.getSelectedTerminal().pipe(
      take(1),
      switchMap(terminal => {
        if (!terminal) return of(false);

        const setting = terminal.Settings.find(s => s.Key === '992'); // Pin device

        if (!setting) return of(false);

        const receiptPayload: PosOrderRecieptDTO = new PosOrderRecieptDTO();
        receiptPayload.IpAddress = setting.IpAddress;
        receiptPayload.Port = setting.Port;
        receiptPayload.Order = order;
        receiptPayload.Amount = amount ?? 1;

        const headers = { 'X-Calling-Function': 'reprintReceipt' };
        const url = `${environment.functionAppUrl}PosOrderPrintReceipt/${terminal.Account.id}`;

        return this._http.post<boolean>(url, receiptPayload, { headers });
      })
    );
  }

  openDrawer(): Observable<boolean> {
    return this._posService.getSelectedTerminal().pipe(
      take(1),
      switchMap(terminal => {
        if (!terminal) return of(false);

        const setting = terminal.Settings.find(s => s.Key === '990'); // Drawer

        if (!setting) return of(false);

        const drawerPayload: PosOrderDrawerDTO = new PosOrderDrawerDTO();
        drawerPayload.IpAddress = setting.IpAddress;
        drawerPayload.Port = setting.Port;

        const headers = { 'X-Calling-Function': 'openDrawer' };
        const url = `${environment.functionAppUrl}PosOrderOpenDrawer/${terminal.Account.id}`;

        return this._http.post<boolean>(url, drawerPayload, { headers });
      })
    );
  }

  confirmDrawer(employeeId: string, terminalId: string): Observable<boolean> {
    return this._posService.getPosShopAccount().pipe(
      first(),
      switchMap(posShopAccount => {
        const order: PosOrderSetDTO = new PosOrderSetDTO();
        order.EventId = PosOrderEventEnum.CONFIRM_DRAWER; // 8900
        order.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN;
        order.PosShopAccountId = posShopAccount.Account.id;
        order.PosShopTerminalId = terminalId;
        order.EmployeeId = employeeId;
        order.Module = ['POS'];

        console.log('Confirm Drawer:', order.PosShopAccountId);
        console.log('Confirm Drawer:', order.EmployeeId);

        const headers = {
          'X-Calling-Function': 'confirmDrawer'
        };
        const url = `${environment.functionAppUrl}PosOrderActivity`;

        return this._http.post<boolean>(url, order, { headers });
      })
    );
  }
}

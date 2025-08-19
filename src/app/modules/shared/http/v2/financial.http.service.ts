import { Observable, tap } from 'rxjs';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { CashFlowDTO, MutationDTO, PosFinancialDTO } from '../../dtos/posFinancial/posFinancial.dto';
import { PatchMutationPayloadDTO, JournalCashFlowCloseDTO, OrderSetDTO, PosOrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export class FinancialHttpService {
  constructor(protected _http: HttpClient) {}

  patchFinancialMutation2(
    matationRecord: MutationDTO,
    posFinancialId: string,
    remark = '',
    newPinValue = 0,
    cashflowId: string,
    checkOutValue = 0
  ): Observable<boolean> {
    const payload: PatchMutationPayloadDTO = new PatchMutationPayloadDTO();
    payload.EventId = PosOrderEventEnum.PATCH_MUTATION; // 6000
    payload.ReturnTypeEventId = PosOrderReturnTypeEnum.BOOLEAN; // 50
    payload.FinancialId = posFinancialId;
    payload.MutationId = matationRecord.id;
    payload.Mutation = matationRecord;

    const JournalCashFlowClose: JournalCashFlowCloseDTO = new JournalCashFlowCloseDTO();
    JournalCashFlowClose.Created = new Date();
    JournalCashFlowClose.AmountDifference = 0;
    JournalCashFlowClose.FinancialCashFlowId = cashflowId;

    if (remark && remark.trim() !== '') {
      JournalCashFlowClose.Remark = remark;
    }

    if (newPinValue != 0) {
      JournalCashFlowClose.AmountPinClose = newPinValue;
    }

    if (checkOutValue != 0) {
      JournalCashFlowClose.AmountCheckOut = checkOutValue;
    }

    payload.JournalCashFlowClose = JournalCashFlowClose;

    const headers = {
      'X-Calling-Function': 'patchFinancialMutation'
    };
    const url = `${environment.functionAppUrl}PosOrderActivity`;

    return this._http.post<boolean>(url, payload, { headers });
  }

  patchCashFlow(cashFlows: CashFlowDTO[], posFinancialId: string): Observable<boolean> {
    const conn = `${environment.functionAppUrl}PatchPosFinancial`;
    const body = {
      PosFinancial: {
        id: posFinancialId,
        CashFlows: cashFlows
      }
    };
    return this._http.patch<boolean>(conn, body);
  }

  patchPosFinancial(posFinancial: PosFinancialDTO): Observable<boolean> {
    const conn = `${environment.functionAppUrl}PatchPosFinancial`;
    const body = {
      PosFinancial: posFinancial
    };
    return this._http.patch<boolean>(conn, body);
  }

  getPosFinancials(selectedDate: Date): Observable<PosFinancialDTO[]> {
    const order: PosOrderSetDTO = new PosOrderSetDTO();
    order.EventId = PosOrderEventEnum.POS_FINANCIAL; // 9000
    order.ReturnTypeEventId = PosOrderReturnTypeEnum.GET_POS_FINANCIAL; // 45
    order.Module = ['POS'];

    const ord: OrderSetDTO = new OrderSetDTO();
    ord.OrderedDate = selectedDate;
    order.Order = ord;
    //! selected date: collection: PosFinancial.Created

    const headers = {
      'X-Calling-Function': 'getPosFinancials'
    };
    const url = `${environment.functionAppUrl}PosOrderActivity`;
    //! All records for all shops
    return this._http.post<PosFinancialDTO[]>(url, order, { headers }).pipe(tap(result => console.log('getPosFinancials result:', result)));
  }
}

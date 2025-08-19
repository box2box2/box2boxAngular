import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PosOrderEventEnum } from '../../data/enums/posOrderEvents.enum';
import { PosOrderReturnTypeEnum } from '../../data/enums/posOrderReturnType.enum';
import { DailyReportDTO } from '../../dtos/posOrder/posBackOffice.dto';
import { PosOrderSetDTO, OrderSetDTO } from '../../dtos/posOrderSet/posOrderSet.dto';
import { environment } from '../../../../../environments/environment';

export class BackOfficeHttpService {
  constructor(protected _http: HttpClient) {}

  getBackOfficeOrder(startDate: Date, endDate: Date, isForSingleShop = false, shopId?: string): Observable<DailyReportDTO> {
    const order: PosOrderSetDTO = new PosOrderSetDTO();
    order.EventId = PosOrderEventEnum.BACK_OFFICE; // 8400
    order.ReturnTypeEventId = PosOrderReturnTypeEnum.BACK_OFFICE_ORDER; // 40
    const ord: OrderSetDTO = new OrderSetDTO();
    ord.OrderedDate = startDate;
    ord.DeliveryDate = endDate;
    order.Order = ord;
    order.PosShopAccountId = null;
    order.Module = ['POS'];

    let headers = {
      'X-Calling-Function': 'getBackOfficeOrder all shops'
    };
    console.log(isForSingleShop);
    if (isForSingleShop) {
      order.PosShopAccountId = shopId as string;
      headers = {
        'X-Calling-Function': 'getBackOfficeOrder single shop'
      };
    }
    const url = `${environment.functionAppUrl}PosOrderActivity`;

    return this._http.post<DailyReportDTO>(url, order, { headers });
  }
}

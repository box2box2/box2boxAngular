import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AccountFilterDTO } from '../../dtos/accountDTO/account-filterDTO';
import { InvoiceFullDTO } from '../../dtosV2/invoice/invoiceFull.dto';
import { environment } from '../../../../../environments/environment';

export class InvoiceAccountHttpService {
  constructor(protected _http: HttpClient) {}

  getPosInvoiceAccountsSimple(companyId: string): Observable<InvoiceFullDTO[]> {
    const filter: AccountFilterDTO = new AccountFilterDTO();
    filter.Types = null;
    filter.SimpleView = true;
    filter.AccountId = null;
    filter.CompanyId = companyId;
    filter.RecordCount = 500;
    filter.Tags = ['POS-INVOICE'];
    const conn = `${environment.functionAppUrl}GetAccounts`;
    return this._http.post<InvoiceFullDTO[]>(conn, filter);
  }
}

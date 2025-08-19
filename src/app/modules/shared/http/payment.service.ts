import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DebitRequestDTO } from '../dtos/payment/payment.dto';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.functionAppUrl}`;

  constructor(private http: HttpClient) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initiatePayment(request: DebitRequestDTO): Observable<any> {
    if (!request.txId) {
      request.txId = 'tx_' + Math.random().toString(36).substring(2, 15);
    }

    const formattedRequest = {
      ...request,
      amount: Number(request.amount.toFixed(2))
    };

    return this.http.post(`${this.apiUrl}/CallPaymentTerminal`, formattedRequest);
  }

  processCTMP(terminalId: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/ProcessCTMP/${terminalId}`, null);
  }

  cancelPayment(terminalId: string): Observable<unknown> {
    return this.http.post(`${this.apiUrl}/CancelPayment/${terminalId}`, null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPaymentStatus(terminalId: string, ssai: string, reference: string, txid: string): Observable<any> {
    const body = {
      TerminalId: terminalId,
      Ssai: ssai,
      Reference: reference,
      TxId: txid
    };

    return this.http.post(`${this.apiUrl}/GetPaymentStatus`, body);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getPaymentTerminalStatus(terminalId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/GetPaymentTerminalStatus/${terminalId}`);
  }
}

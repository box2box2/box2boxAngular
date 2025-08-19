import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TerminalFullDTO } from '../../dtosV2/posTerminal/terminalFull.dto';
import { MasterDTO } from '../../dtosV2/shared/master.dto';
import { environment } from '../../../../../environments/environment';
import { AccountDTO } from '../../dtosV2/shared/account.dto';

// Importing sample data for testing purposes
import * as terminalSample from '../../../../../assets/jsonSamples/posCollection/posTerminal/01_posTerminal.json';
import * as accountBaseSample from '../../../../../assets/jsonSamples/accountCollection/account/01_account_base.json';
import * as terminalDrawerSample from '../../../../../assets/jsonSamples/posCollection/posTerminal/02_posTerminalDrawer.json';
import * as terminalPinSample from '../../../../../assets/jsonSamples/posCollection/posTerminal/03_posTerminalPin.json';
import * as terminalPaymentOptionSample1 from '../../../../../assets/jsonSamples/posCollection/posTerminal/04_posTerminalPaymentOption1.json';
import * as terminalPaymentOptionSample2 from '../../../../../assets/jsonSamples/posCollection/posTerminal/05_posTerminalPaymentOption2.json';
import * as terminalPaymentOptionSample3 from '../../../../../assets/jsonSamples/posCollection/posTerminal/06_posTerminalPaymentOption3.json';
import * as terminalPaymentOptionSample4 from '../../../../../assets/jsonSamples/posCollection/posTerminal/07_posTerminalPaymentOption4.json';
import * as terminalPaymentOptionSample5 from '../../../../../assets/jsonSamples/posCollection/posTerminal/08_posTerminalPaymentOption5.json';
import * as terminalRefundOptionSample1 from '../../../../../assets/jsonSamples/posCollection/posTerminal/09_posTerminalRefundOption1.json';
import * as terminalRefundOptionSample2 from '../../../../../assets/jsonSamples/posCollection/posTerminal/10_posTerminalRefundOption2.json';
import * as terminalRefundOptionSample3 from '../../../../../assets/jsonSamples/posCollection/posTerminal/11_posTerminalRefundOption3.json';
import * as terminalRefundOptionSample4 from '../../../../../assets/jsonSamples/posCollection/posTerminal/12_posTerminalRefundOption4.json';
import * as terminalRefundOptionSample5 from '../../../../../assets/jsonSamples/posCollection/posTerminal/13_posTerminalRefundOption5.json';
import * as terminalSettingSample1 from '../../../../../assets/jsonSamples/posCollection/posTerminal/14_posTerminalSetting1.json';
import * as terminalSettingSample2 from '../../../../../assets/jsonSamples/posCollection/posTerminal/15_posTerminalSetting2.json';
import * as terminalSettingSample3 from '../../../../../assets/jsonSamples/posCollection/posTerminal/16_posTerminalSetting3.json';
import * as terminalSettingSample4 from '../../../../../assets/jsonSamples/posCollection/posTerminal/17_posTerminalSetting4.json';



@Injectable({
  providedIn: 'root'
})
export class TerminalHttpService {
  constructor(protected _http: HttpClient) {}

  getTerminalById(id: string): Observable<TerminalFullDTO> {
    id;
    // const filter: AccountFilterDTO = new AccountFilterDTO();
    // filter.Types = ['POS-TERMINAL'];
    // filter.SimpleView = false;
    // filter.AccountId = id;
    // filter.CompanyId = '';
    // // TODO get correct url
    // const conn = `${environment.functionAppUrl}GetAccounts`;
    // const headers = {
    //   'X-Calling-Function': 'getTerminalById'
    // };
    // return this._http.post<TerminalFullDTO[]>(conn, filter, { headers }).pipe(
    //   tap(response => console.log('API Response:', response)),
    //   map(terminals => {
    //     if (!terminals || terminals.length === 0) {
    //       throw new Error('No terminal found for the given ID');
    //     }
    //     console.log('Processed Result:', terminals[0]);
    //     return terminals[0];
    //   })
    // ) as Observable<TerminalFullDTO>;
    const terminalFullSample = new TerminalFullDTO();
    terminalFullSample.Account = accountBaseSample as AccountDTO;
    terminalFullSample.Terminal = terminalSample;
    terminalFullSample.Settings = [terminalSettingSample1, terminalSettingSample2, terminalSettingSample3, terminalSettingSample4];
    terminalFullSample.Pin = terminalPinSample;
    terminalFullSample.PaymentOptions = [
      terminalPaymentOptionSample1,
      terminalPaymentOptionSample2,
      terminalPaymentOptionSample3,
      terminalPaymentOptionSample4,
      terminalPaymentOptionSample5
    ];
    terminalFullSample.RefundOptions = [terminalRefundOptionSample1, terminalRefundOptionSample2, terminalRefundOptionSample3, terminalRefundOptionSample4, terminalRefundOptionSample5];
    terminalFullSample.Payments = [];
    terminalFullSample.Drawer = terminalDrawerSample;
    return of(terminalFullSample);
  }

  patchTerminalDrawer(drawerStatus: MasterDTO, posTerminalId: string): Observable<boolean> {
    const conn = `${environment.functionAppUrl}PatchTerminal`;
    const body = {
      Terminal: {
        id: posTerminalId,
        DrawerStatus: drawerStatus
      }
    };
    return this._http.patch<boolean>(conn, body);
  }
}

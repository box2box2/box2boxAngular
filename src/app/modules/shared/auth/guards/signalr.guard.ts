import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SignalRConnectionGuard implements CanActivate {

  async canActivate(): Promise<boolean> {
    // TODO fix guard
    return true;
    // try {
    //   const sessionId = sessionStorage.getItem('pos-session-id') ?? uuidv4();
    //   sessionStorage.setItem('pos-session-id', sessionId);

    //   const connectionInfo: ConnectionInfo = {
    //     shopId: 'SHOP001',
    //     terminalId: 'TERM001',
    //     userId: 'USER99',
    //     clientName: 'Front Desk',
    //     sessionId: sessionId,
    //     connectionId: ''
    //   };

    //   await this._signalRService.initializeHubConnection('POS Client');
    //   connectionInfo.connectionId = this._signalRService.hubConnection.connectionId ?? '';
    //   await this._signalRService.knock(connectionInfo);

    //   return true;
    // } catch (err) {
    //   console.error('SignalR connection failed in guard:', err);
    //   // this._router.navigate(['/error']); // Optional: navigate to error screen
    //   return false;
    // }
  }
}

// import { Injectable, NgZone } from '@angular/core';
// import * as SignalR from '@microsoft/signalr';
// import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
// import { v4 as uuidv4 } from 'uuid';
// import { CompanyDTO } from '../dtos/shared/company.dto';
// import { TerminalPaymentDTO } from '../dtos/payment/payment.dto';
// import { PosV2Service } from '../../pos/services/pos.service';
// import { environment } from '../../../../environments/environment';
// import { AppActions } from '../../../store/app.actions';

// @Injectable({
//   providedIn: 'root'
// })
// export class SignalRService {
//   // Static property to hold the singleton instance.
//   private static _instance: SignalRService | null = null;

//   // Static subject for message refresh
//   private static _onReceiveMessageRefresh: Subject<string> = new Subject<string>();
//   private static _onReceiveMessagePayment: Subject<TerminalPaymentDTO> = new Subject<TerminalPaymentDTO>();
//   private static _onReceiveMessageForceDisconnect: Subject<string> = new Subject<string>();
//   public hubConnection!: SignalR.HubConnection;
//   public negotiateURL: string = environment.functionAppUrl + '/NegotiatePos';
//   public knockURL: string = environment.functionAppUrl + '/Knock';
//   public deKnockURL: string = environment.functionAppUrl + '/DeKnock';

//   public connectionState$!: Observable<string>;
//   private connectionStateSubject = new BehaviorSubject<string>('Disconnected');

//   // Static getter for our message refresh observable.
//   public static get OnReceiveMessageRefresh(): Observable<string> {
//     return this._onReceiveMessageRefresh.asObservable();
//   }

//   // Static getter for payment observable.
//   public static get OnReceiveMessagePayment(): Observable<TerminalPaymentDTO> {
//     return this._onReceiveMessagePayment.asObservable();
//   }

//   // Static getter for our message force disconnect observable.
//   public static get OnReceiveMessageForceDisconnect(): Observable<string> {
//     return this._onReceiveMessageForceDisconnect.asObservable();
//   }

//   // Getter to access the current connection state easily.
//   public get currentConnectionState(): string {
//     return this.connectionStateSubject.value;
//   }

//   // The constructor: if an instance already exists, return it.
//   // eslint-disable-next-line @typescript-eslint/member-ordering
//   constructor(
//     private _ngZone: NgZone,
//     private _posService: PosV2Service
//   ) {
//     if (SignalRService._instance) {
//       return SignalRService._instance;
//     }
//     SignalRService._instance = this;
//     this.connectionState$ = this.connectionStateSubject.asObservable();
//   }

//   // If you prefer to access the instance explicitly:
//   public static getInstance(): SignalRService {
//     if (!SignalRService._instance) {
//       throw new Error('SignalRService has not been instantiated. Ensure it is injected in a component that initializes first.');
//     }
//     return SignalRService._instance;
//   }

//   public async Negotiate(): Promise<void> {
//     if (this.hubConnection) return; // don't start another hub connection
//     try {
//       // Retrieve the sessionId from storage via PosService.
//       let sessionId: string | null = await firstValueFrom(this._posService.getSessionId());

//       // If no sessionId exists, generate a new one and store it.
//       if (!sessionId) {
//         sessionId = uuidv4();
//         this._posService.dispatchAppAction(AppActions.setSessionId({ sessionId }));
//       }

//       // Use the sessionId as the userId header in your negotiate call.
//       const negotiateResponse: Response = await fetch(this.negotiateURL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           userId: sessionId
//         }
//       });

//       if (!negotiateResponse.ok) {
//         throw new Error(`Failed to negotiate. Status: ${negotiateResponse.status}`);
//       }

//       const negotiateData = await negotiateResponse.json();

//       this.hubConnection = new SignalR.HubConnectionBuilder()
//         .withUrl(negotiateData.url, {
//           accessTokenFactory: () => negotiateData.accessToken
//         })
//         .configureLogging(SignalR.LogLevel.Information)
//         .build();

//       this.hubConnection.on('Refresh', message => {
//         SignalRService._onReceiveMessageRefresh.next(message);
//       });

//       this.hubConnection.on('Payment', (serializedMessage: string) => {
//         try {
//           // Parse the message as it might be a string containing JSON
//           const parsedMessage = typeof serializedMessage === 'string' ? JSON.parse(serializedMessage) : serializedMessage;

//           // The message might be directly the TerminalPaymentDTO, or it might be wrapped
//           const paymentData = parsedMessage.Message
//             ? (JSON.parse(parsedMessage.Message) as TerminalPaymentDTO)
//             : (parsedMessage as TerminalPaymentDTO);

//           SignalRService._onReceiveMessagePayment.next(paymentData);
//         } catch (error) {
//           console.error('Error processing payment message:', error);
//         }
//       });

//       this.hubConnection.on('ForceDisconnect', async message => {
//         SignalRService._onReceiveMessageForceDisconnect.next(message);

//         // Option 1: Wait a short delay before calling stop()
//         // await new Promise(resolve => setTimeout(resolve, 200)); // adjust delay if needed

//         await this.hubConnection.stop();

//         // // Option 2: Alternatively, delay after stop(), before calling DeKnock.
//         // await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

//         // const sessionId = await firstValueFrom(this._posService.getSessionId());

//         // const signalRConnection: SignalRConnectionDTO = {
//         //   id: sessionId,
//         //   ShopId: '', // or set appropriate value if needed
//         //   TerminalId: '',
//         //   UserId: sessionId,
//         //   ClientName: '',
//         //   ConnectionId: '', // Not necessary for DeKnock
//         //   SessionId: sessionId,
//         //   IsConnected: false, // Mark as disconnected
//         //   ReconnectAttempts: 0,
//         //   Company: new CompanyDTO(),
//         //   Groups: []
//         // };

//         // try {
//         //   await this.DeKnock(signalRConnection);
//         //   console.log('SignalR deKnock succeeded.');
//         // } catch (error) {
//         //   console.log('SignalR deKnock failed:', error);
//         // }
//       });

//       // Wrap event handlers in NgZone.run().
//       this.hubConnection.onclose(() => {
//         this._ngZone.run(() => {
//           this.connectionStateSubject.next('Disconnected');
//         });
//       });

//       this.hubConnection.onreconnecting(() => {
//         this._ngZone.run(() => {
//           this.connectionStateSubject.next('Reconnecting');
//         });
//       });

//       this.hubConnection.onreconnected(() => {
//         this._ngZone.run(() => {
//           this.connectionStateSubject.next('Connected');
//         });
//       });

//       await this.hubConnection.start();
//       this._ngZone.run(() => {
//         this.connectionStateSubject.next('Connected');
//       });
//       console.log('Hub connection started successfully.');
//     } catch (error) {
//       console.error('Failed to initialize hub connection:', error);
//     }
//   }

//   public async Knock(connectionInfo: SignalRConnectionDTO): Promise<void> {
//     try {
//       const knockResponse: Response = await fetch(this.knockURL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           userId: uuidv4()
//         },
//         body: JSON.stringify(connectionInfo)
//       });

//       if (!knockResponse.ok) {
//         throw new Error(`Failed to knock. Status: ${knockResponse.status}`);
//       }
//       const knockData = await knockResponse.json();
//       console.log('Knock data:', knockData);
//     } catch (error) {
//       console.error('Failed to initialize knock:', error);
//     }
//   }

//   public async DeKnock(connectionInfo: SignalRConnectionDTO): Promise<void> {
//     try {
//       const deKnockResponse: Response = await fetch(this.deKnockURL, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           userId: uuidv4()
//         },
//         body: JSON.stringify(connectionInfo)
//       });

//       if (!deKnockResponse.ok) {
//         throw new Error(`Failed to deKnock. Status: ${deKnockResponse.status}`);
//       }
//       const deKnockData = await deKnockResponse.json();
//       console.log('DeKnock data:', deKnockData);
//     } catch (error) {
//       console.error('Failed to initialize deKnock:', error);
//     }
//   }

//   public async disconnectClient(): Promise<void> {
//     await this.hubConnection.invoke('DisconnectClient');
//   }
// }

// export interface SignalRConnectionDTO {
//   id: string;
//   ShopId: string;
//   TerminalId: string;
//   UserId: string;
//   ClientName: string;
//   ConnectionId: string;
//   SessionId: string;
//   IsConnected: boolean;
//   ReconnectAttempts: number;
//   Company: CompanyDTO;
//   Groups: string[];
// }

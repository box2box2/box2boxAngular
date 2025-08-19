// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { Component } from '@angular/core';
// import {
//   ComponentFixture,
//   TestBed,
//   fakeAsync,
//   tick,
// } from '@angular/core/testing';
// import { Router } from '@angular/router';
// import { MatSnackBar } from '@angular/material/snack-bar';
// import { MatDialog } from '@angular/material/dialog';
// import { MatTableModule } from '@angular/material/table';
// import { MatSortModule } from '@angular/material/sort';
// import { MatIconModule } from '@angular/material/icon';
// import { MatButtonModule } from '@angular/material/button';
// import { MatCardModule } from '@angular/material/card';
// import { MatRippleModule } from '@angular/material/core';
// import { MatSidenavModule } from '@angular/material/sidenav';
// import { MatListModule } from '@angular/material/list';
// import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
// import { ReactiveFormsModule, FormsModule } from '@angular/forms';
// import { ChangeDetectorRef } from '@angular/core';
// import { of } from 'rxjs';
// import { RouterTestingModule } from '@angular/router/testing';

// // All services used by the component
// import { PosV2Service } from '../../modules/pos/services/pos.service';
// import { SharedService } from '../../modules/shared/http/shared.service';
// import { TerminalHttpService } from '../../modules/shared/http/v2/terminal.http.service';
// import { FinancialHttpService } from '../../modules/shared/http/v2/financial.http.service';
// import { BackOfficeHttpService } from '../../modules/shared/http/v2/backOffice.http.service';
// import { SignalRService } from '../../modules/shared/http/signalR.service';
// import { DashboardComponent } from '../dashboard/dashboard.component';

// // Minimal dummy component for root
// @Component({ standalone: true, template: '' })
// class DummyComponent {}

// describe('DashboardComponent', () => {
//   let component: DashboardComponent;
//   let fixture: ComponentFixture<DashboardComponent>;

//   // Mocks for dependencies
//   const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
//     url: '/dashboard',
//   });
//   const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);
//   const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
//   const cdrSpy = jasmine.createSpyObj('ChangeDetectorRef', [
//     'markForCheck',
//     'detectChanges',
//   ]);
//   const posV2ServiceSpy = jasmine.createSpyObj('PosV2Service', [
//     'getSessionId',
//     'getSelectedTerminal',
//     'getPosShopAccount',
//     'dispatchPosAction',
//   ]);
//   const sharedServiceSpy = jasmine.createSpyObj('SharedService', [
//     'clearAllStates',
//   ]);
//   const terminalHttpServiceSpy = jasmine.createSpyObj('TerminalHttpService', [
//     'getTerminalById',
//     'patchTerminalDrawer',
//   ]);
//   const financialHttpServiceSpy = jasmine.createSpyObj('FinancialHttpService', [
//     'getPosFinancials',
//   ]);
//   const backOfficeHttpServiceSpy = jasmine.createSpyObj(
//     'BackOfficeHttpService',
//     ['getBackOfficeOrder'],
//   );
//   const signalRServiceSpy = jasmine.createSpyObj(
//     'SignalRService',
//     ['Negotiate', 'Knock', 'DeKnock'],
//     {
//       currentConnectionState: 'Disconnected',
//       hubConnection: { connectionId: 'test-conn' },
//       connectionState$: of('Connected'),
//     },
//   );

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [
//         RouterTestingModule.withRoutes([
//           { path: '', component: DummyComponent }, // use DummyComponent as root!
//         ]),
//         DummyComponent, // standalone!
//         DashboardComponent, // standalone!
//         MatTableModule,
//         MatSortModule,
//         MatIconModule,
//         MatButtonModule,
//         MatRippleModule,
//         MatCardModule,
//         MatSidenavModule,
//         MatListModule,
//         MatProgressSpinnerModule,
//         ReactiveFormsModule,
//         FormsModule,
//       ],
//       providers: [
//         { provide: Router, useValue: routerSpy },
//         { provide: MatSnackBar, useValue: snackBarSpy },
//         { provide: MatDialog, useValue: dialogSpy },
//         { provide: ChangeDetectorRef, useValue: cdrSpy },
//         { provide: PosV2Service, useValue: posV2ServiceSpy },
//         { provide: SharedService, useValue: sharedServiceSpy },
//         { provide: TerminalHttpService, useValue: terminalHttpServiceSpy },
//         { provide: FinancialHttpService, useValue: financialHttpServiceSpy },
//         { provide: BackOfficeHttpService, useValue: backOfficeHttpServiceSpy },
//         { provide: SignalRService, useValue: signalRServiceSpy },
//       ],
//     }).compileComponents();

//     fixture = TestBed.createComponent(DashboardComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   afterEach(() => {
//     routerSpy.navigate.calls.reset();
//     snackBarSpy.open.calls.reset();
//     dialogSpy.open.calls.reset();
//     cdrSpy.markForCheck.calls.reset();
//     cdrSpy.detectChanges.calls.reset();
//     posV2ServiceSpy.getSessionId.calls.reset();
//     posV2ServiceSpy.getSelectedTerminal.calls.reset();
//     posV2ServiceSpy.getPosShopAccount.calls.reset();
//     posV2ServiceSpy.dispatchPosAction.calls.reset();
//     sharedServiceSpy.clearAllStates.calls.reset();
//     terminalHttpServiceSpy.getTerminalById.calls.reset();
//     terminalHttpServiceSpy.patchTerminalDrawer.calls.reset();
//     financialHttpServiceSpy.getPosFinancials.calls.reset();
//     backOfficeHttpServiceSpy.getBackOfficeOrder.calls.reset();
//     signalRServiceSpy.Negotiate.calls.reset();
//     signalRServiceSpy.Knock.calls.reset();
//     signalRServiceSpy.DeKnock.calls.reset();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('should navigate to /pos/items-view when navigateToPos is called and status is "10"', fakeAsync(() => {
//     const mockTerminal = {
//       Drawer: { Status: { Key: '10' } },
//       Account: { id: '1' },
//     };
//     posV2ServiceSpy.getSelectedTerminal.and.returnValue(of(mockTerminal));

//     component.navigateToPos();
//     tick();

//     expect(routerSpy.navigate).toHaveBeenCalledWith(['/pos', 'items-view']);
//   }));

//   it('should set isLoading to true and call updateLoadingState when fetchData is called', () => {
//     spyOn(component, 'updateLoadingState').and.callThrough();
//     backOfficeHttpServiceSpy.getBackOfficeOrder.and.returnValue(of(null));
//     component.currentPosShop = { Account: { id: 'shop1' } } as any;
//     component.fetchData();
//     expect(component.updateLoadingState).toHaveBeenCalledWith(true);
//     expect(component.isLoading).toBeTrue();
//   });

//   it('should call clearAllStates and navigate to /login on logout', () => {
//     component.logout();
//     expect(sharedServiceSpy.clearAllStates).toHaveBeenCalled();
//     expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
//   });

//   it('should add and remove rows from clickedRows when onRowClick is called', () => {
//     const row = { Description: 'Test' } as any;
//     component.onRowClick(row);
//     expect(component.clickedRows.has(row)).toBeTrue();
//     component.onRowClick(row);
//     expect(component.clickedRows.has(row)).toBeFalse();
//   });

//   it('should unsubscribe and clear chart data on ngOnDestroy', () => {
//     // Set up chart mocks
//     component.testChart = { destroy: jasmine.createSpy('destroy') } as any;
//     component.barChart = { destroy: jasmine.createSpy('destroy') } as any;
//     component.paymentChart = { destroy: jasmine.createSpy('destroy') } as any;

//     // Call ngOnDestroy
//     component.ngOnDestroy();

//     // Chart destroy methods should have been called
//     expect((component.testChart as any)?.destroy).toBeUndefined();
//     expect((component.barChart as any)?.destroy).toBeUndefined();
//     expect((component.paymentChart as any)?.destroy).toBeUndefined();
//   });
// });


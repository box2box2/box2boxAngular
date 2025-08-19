import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router, RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import {
  Subject,
  takeUntil,
  firstValueFrom,
  debounceTime,
  first,
  switchMap,
  of,
  tap,
  Observable,
  catchError,
  throwError,
} from 'rxjs';
import { PosV2Service } from '../../modules/pos/services/pos.service';
import { PosActions } from '../../modules/pos/store/pos.actions';
import { ConfirmDrawerDialogComponent } from '../../modules/shared/dialog/components/confirm/confirm-drawer-dialog/confirm-drawer-dialog.component';
import { CashFlowDTO } from '../../modules/shared/dtos/posFinancial/posFinancial.dto';
import {
  PosShop,
  DailyReportDTO,
  ItemSummary,
  FinancialPaymentSummary,
} from '../../modules/shared/dtos/posOrder/posBackOffice.dto';
import { CompanyDTO } from '../../modules/shared/dtos/shared/company.dto';
import { ShopFullDTO } from '../../modules/shared/dtosV2/posShop/shopFull.dto';
import { TerminalFullDTO } from '../../modules/shared/dtosV2/posTerminal/terminalFull.dto';
import { MasterDTO } from '../../modules/shared/dtosV2/shared/master.dto';
import { SharedService } from '../../modules/shared/http/shared.service';
import {
  SignalRService,
  SignalRConnectionDTO,
} from '../../modules/shared/http/signalR.service';
import { BackOfficeHttpService } from '../../modules/shared/http/v2/backOffice.http.service';
import { FinancialHttpService } from '../../modules/shared/http/v2/financial.http.service';
import { TerminalHttpService } from '../../modules/shared/http/v2/terminal.http.service';
import { DateService } from '../../services/date-util.services';
import { HeaderComponent } from '../header/header.component';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    MatIconModule,
    MatButtonModule,
    MatRippleModule,
    MatCardModule,
    MatSidenavModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSortModule,
  ],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;

  isLoading = false;
  selectedShop = new PosShop();
  backOfficeOrder: DailyReportDTO | null = null;
  testChart: Chart | null = null;
  barChart: Chart | null = null;
  paymentChart: Chart | null = null;
  selectedTerminal: TerminalFullDTO | null = null;
  sessionId: string | null = null;
  currentPosShop = new ShopFullDTO();
  clickedRows = new Set<ItemSummary>();
  displayedColumnsItems: string[] = [
    'Description',
    'Number',
    'Quantity',
    'Price',
    'PriceExclusive',
    'TotalPrice',
    'Prognose',
    'Sales',
    'InOrder',
  ];
  itemsSoldDataSource = new MatTableDataSource<ItemSummary>([]);
  displayedStockAlertColumns: string[] = [
    'Description',
    'Number',
    'Quantity',
    'Price',
    'PriceExclusive',
    'TotalPrice',
    'StockAlert',
  ];
  stockAlertDataSource = new MatTableDataSource<ItemSummary>([]);

  private unsubscribe$ = new Subject<void>();
  private lastKnockTimestamp = 0;
  private knockCooldownMs = 10000;

  constructor(
    private _router: Router,
    private _signalRService: SignalRService,
    public signalRService: SignalRService,
    private _sharedService: SharedService,
    private _snackbar: MatSnackBar,
    private _cdr: ChangeDetectorRef,
    private _posService: PosV2Service,
    private _dialog: MatDialog,
    private _terminalHttpService: TerminalHttpService,
    private _financialHttpService: FinancialHttpService,
    private _backOfficeHttpService: BackOfficeHttpService,
  ) {}

  get averageSpending(): number {
    const total = this.selectedShop.PosTerminalSummary.AmountInclusive;
    const count = this.selectedShop.Orders.length;
    return Math.floor((total / count) * 100) / 100;
  }

  get isPosRoute(): boolean {
    return this._router.url.startsWith('/pos');
  }

  async ngAfterViewInit(): Promise<void> {
    this.signalRService.connectionState$
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => this._cdr.markForCheck());

    this.fetchData();

    if (this._signalRService.currentConnectionState === 'Connected') {
      console.log('SignalR already connected, skipping negotiation');
      return;
    }

    try {
      await this._signalRService.Negotiate();
      this.sessionId = await firstValueFrom(this._posService.getSessionId());
      this.selectedTerminal = await firstValueFrom(
        this._posService.getSelectedTerminal(),
      );
      this.currentPosShop = await firstValueFrom(
        this._posService.getPosShopAccount(),
      );

      this.tryKnock();
    } catch (error) {
      console.error('SignalR init failed:', error);
    }

    SignalRService.OnReceiveMessageRefresh.pipe(
      takeUntil(this.unsubscribe$),
      debounceTime(3000),
    ).subscribe(() => {
      console.log('Debounced SignalR refresh event');
      this.fetchData();
    });
  }

  updateLoadingState(newState: boolean): void {
    this.isLoading = newState;
    this._cdr.detectChanges();
  }

  navigateToPos(): void {
    //this._router.navigate(['/pos', 'items-view']);
    //! For testing purposes, uncomment the following lines to open the dialog
    // this._dialog
    //   .open(ConfirmDrawerDialogComponent, {
    //     width: 'unset',
    //     height: 'unset',
    //     disableClose: true
    //   })
    //   .afterClosed()
    //   .subscribe(res => {
    //     console.log('Dialog result:', res);
    //   });
    this._posService
      .getSelectedTerminal()
      .pipe(
        first(),
        switchMap((terminal) => {
          if (terminal?.Drawer && terminal.Drawer.Status.Key != '99') {
            return this._terminalHttpService
              .getTerminalById(terminal.Account.id)
              .pipe(
                switchMap((updatedTerminal) => {
                  const todayUtc = DateService.getNowUtc();
                  return this._financialHttpService
                    .getPosFinancials(todayUtc)
                    .pipe(
                      switchMap((posFinancials) => {
                        if (
                          posFinancials == null ||
                          posFinancials.length == 0
                        ) {
                          const dialogRef = this._dialog.open(
                            ConfirmDrawerDialogComponent,
                            {
                              width: '510px',
                              disableClose: true,
                            },
                          );

                          dialogRef.afterClosed().subscribe((isCreated) => {
                            if (isCreated) {
                              this._terminalHttpService
                                .getTerminalById(updatedTerminal.Account.id)
                                .subscribe((updatedTerminal) => {
                                  this._posService.dispatchPosAction(
                                    PosActions.setTerminal({
                                      terminal: updatedTerminal,
                                    }),
                                  );
                                  this._router.navigate(['/pos', 'items-view']);
                                });
                            }
                          });

                          return of(null);
                        } else {
                          const posFinancial = posFinancials.find(
                            (record) =>
                              record.PosTerminal.id ===
                              updatedTerminal.Account.id,
                          );
                          if (posFinancial) {
                            const lastCashflowRecord: CashFlowDTO = posFinancial
                              .CashFlows[
                              posFinancial.CashFlows.length - 1
                            ] as CashFlowDTO;

                            const shouldConfirm =
                              lastCashflowRecord?.CurrentStatus?.Key === '80' ||
                              lastCashflowRecord?.CurrentStatus?.Key === '90';

                            if (shouldConfirm) {
                              const dialogRef = this._dialog.open(
                                ConfirmDrawerDialogComponent,
                                {
                                  width: '510px',
                                  height: '90vh',
                                  disableClose: true,
                                },
                              );
                              return dialogRef
                                .afterClosed()
                                .pipe(
                                  tap((result) =>
                                    result
                                      ? this._router.navigate([
                                          '/pos',
                                          'items-view',
                                        ])
                                      : this.logout(),
                                  ),
                                );
                            }

                            if (
                              updatedTerminal.Drawer?.Status.Key === '10' &&
                              lastCashflowRecord?.CurrentStatus?.Key === '10'
                            ) {
                              this._router.navigate(['/pos', 'items-view']);
                              return of(null);
                            }

                            const dialogRef = this._dialog.open(
                              ConfirmDrawerDialogComponent,
                              {
                                width: '510px',
                                height: '90vh',
                                disableClose: true,
                              },
                            );
                            return dialogRef
                              .afterClosed()
                              .pipe(
                                tap((result) =>
                                  result
                                    ? this._router.navigate([
                                        '/pos',
                                        'items-view',
                                      ])
                                    : this.logout(),
                                ),
                              );
                          } else {
                            console.error(
                              'No financial record found for the terminal',
                            );
                            return of(null);
                          }
                        }
                      }),
                    );
                }),
              );
          }

          if (terminal?.Drawer?.Status.Key === '99') {
            const dialogRef = this._dialog.open(ConfirmDrawerDialogComponent, {
              width: '510px',
              disableClose: true,
            });
            return dialogRef
              .afterClosed()
              .pipe(
                tap((result) =>
                  result
                    ? this._router.navigate(['/pos', 'items-view'])
                    : this.logout(),
                ),
              );
          }

          return of(void 0);
        }),
        takeUntil(this.unsubscribe$),
      )
      .subscribe();
  }

  fetchData(): void {
    this.updateLoadingState(true);
    this.getData(this.currentPosShop.Account.id)
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe({
        next: (order: DailyReportDTO | null) => {
          this.processOrderData(order);
          this.itemsSoldDataSource.data =
            this.selectedShop?.PosTerminalSummary?.TotalItemsSummary ?? [];
          this.stockAlertDataSource.data =
            this.selectedShop?.PosTerminalSummary?.StockAlertSummary ?? [];
          setTimeout(() => {
            if (this.sort) {
              this.itemsSoldDataSource.sort = this.sort;
              this.stockAlertDataSource.sort = this.sort;
              this._cdr.detectChanges();
            }
          });
        },
        complete: () => {
          this.updateLoadingState(false);
        },
      });
  }

  setDataInCharts(): void {
    setTimeout(() => {
      const doughnutCanvas = document.getElementById(
        'test-chart',
      ) as HTMLCanvasElement;
      const barCanvas = document.getElementById(
        'bar-chart',
      ) as HTMLCanvasElement;
      const doughnutCanvasPayment = document.getElementById(
        'payment-chart',
      ) as HTMLCanvasElement;

      if (!doughnutCanvas || !barCanvas || !doughnutCanvasPayment) {
        console.error('One or more canvas elements not found!');
        return;
      }

      // Populate table sources
      this.itemsSoldDataSource.data =
        this.selectedShop?.PosTerminalSummary?.TotalItemsSummary ?? [];
      this.stockAlertDataSource.data =
        this.selectedShop?.PosTerminalSummary?.StockAlertSummary ?? [];

      // #region Orders doughnut chart
      const ordersData = [
        this.selectedShop?.PosTerminalSummary?.Orders?.Open ?? 0,
        this.selectedShop?.PosTerminalSummary?.Orders?.Closed ?? 0,
        this.selectedShop?.PosTerminalSummary?.Orders?.Paused ?? 0,
      ];

      if (
        this.testChart &&
        this.testChart.data &&
        Array.isArray(this.testChart.data.datasets) &&
        this.testChart.data.datasets.length > 0
      ) {
        const chart = this.testChart;
        const datasets = chart.data.datasets;

        if (datasets?.[0]) {
          datasets[0].data = ordersData;
          chart.update();
        }
      } else {
        this.testChart = new Chart(doughnutCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Open orders', 'Gesloten orders', 'Gepauzeerde orders'],
            datasets: [
              {
                label: 'Orders',
                data: ordersData,
                backgroundColor: [
                  'rgb(255, 99, 132)',
                  'rgb(54, 162, 235)',
                  'rgb(255, 205, 86)',
                ],
                hoverOffset: 4,
              },
            ],
          },
          options: {
            plugins: {
              legend: { display: true, position: 'top' },
            },
          },
          plugins: [ChartDataLabels],
        });
      }
      // #endregion

      // #region Orders per hour bar chart
      const ordersPerHour = {
        ...this.selectedShop?.PosTerminalSummary?.EmployeesSummary
          ?.OrdersPerHour,
      };
      const barLabels = Object.keys(ordersPerHour);
      const barData = barLabels.map(
        (hour) => ordersPerHour[hour]?.OrderCount ?? 0,
      );

      if (
        this.barChart &&
        this.barChart.data &&
        Array.isArray(this.barChart.data.datasets) &&
        this.barChart.data.datasets.length > 0
      ) {
        const chart = this.barChart;
        const datasets = chart.data.datasets;

        if (datasets?.[0]) {
          chart.data.labels = barLabels;
          datasets[0].data = barData;
          chart.update();
        }
      } else {
        this.barChart = new Chart(barCanvas, {
          type: 'bar',
          data: {
            labels: barLabels,
            datasets: [
              {
                label: 'Orders per uur',
                data: barData,
                backgroundColor: 'rgb(54, 162, 235)',
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              x: { title: { display: true, text: 'Uur' } },
              y: {
                title: { display: true, text: 'Bestel aantal' },
                beginAtZero: true,
              },
            },
          },
        });
      }
      // #endregion

      // #region Payment methods doughnut chart
      const paymentSummary: FinancialPaymentSummary[] =
        this.selectedShop?.PosTerminalSummary?.TotalFinancialPaymentSummary ??
        [];
      const paymentLabels = paymentSummary.map((p) => p.Name);
      const paymentData = paymentSummary.map((p) => p.AmountInclusive ?? 0);

      if (
        this.paymentChart &&
        this.paymentChart.data &&
        Array.isArray(this.paymentChart.data.datasets) &&
        this.paymentChart.data.datasets.length > 0
      ) {
        const chart = this.paymentChart;
        const datasets = chart.data.datasets;

        if (datasets?.[0]) {
          chart.data.labels = paymentLabels;
          datasets[0].data = paymentData;
          chart.update();
        }
      } else {
        this.paymentChart = new Chart(doughnutCanvasPayment, {
          type: 'doughnut',
          data: {
            labels: paymentLabels,
            datasets: [
              {
                label: 'Totaal betalingsbedrag',
                data: paymentData,
                backgroundColor: [
                  'rgb(255, 99, 132)',
                  'rgb(54, 162, 235)',
                  'rgb(255, 205, 86)',
                  'rgb(75, 192, 192)',
                  'rgb(153, 102, 255)',
                ],
                hoverOffset: 4,
              },
            ],
          },
          options: {
            plugins: {
              legend: { display: true, position: 'top' },
              tooltip: {
                callbacks: {
                  label: (tooltipItem): string => {
                    const value = tooltipItem.raw as number;
                    return `${tooltipItem.label}: €${value.toFixed(2)}`;
                  },
                },
              },
            },
          },
          plugins: [ChartDataLabels],
        });
      }
      // #endregion
    }, 100);
  }

  getData(shopId: string): Observable<DailyReportDTO | null> {
    const start = DateService.getUtcMidnightToday(); // 00:00:00 today UTC
    const end = DateService.getUtcMidnightTomorrow(); // 00:00:00 tomorrow UTC

    return this._backOfficeHttpService
      .getBackOfficeOrder(start, end, true, shopId)
      .pipe(
        takeUntil(this.unsubscribe$),
        catchError((err) => {
          console.warn('API call failed:', err);
          if (err.status === 406) {
            this._snackbar.open('Er is iets fout gegaan', 'Close', {
              duration: 3000,
            });
          }
          this.updateLoadingState(false);
          return of(null);
        }),
      );
  }

  async onRefreshClick(): Promise<void> {
    if (this.signalRService.currentConnectionState === 'Disconnected') {
      await this.signalRService.Negotiate();
      const signalRConnection: SignalRConnectionDTO = {
        id: this.sessionId ?? '',
        ShopId: this.currentPosShop.Account.id ?? '',
        TerminalId: this.selectedTerminal?.Account.id ?? '',
        UserId: this.sessionId ?? '',
        ClientName: this.selectedTerminal?.Account.Name ?? '',
        ConnectionId: this._signalRService.hubConnection.connectionId ?? '',
        SessionId: this.sessionId ?? '',
        IsConnected: true,
        ReconnectAttempts: 0,
        Company: new CompanyDTO(),
        Groups: [],
      };
      this._signalRService.Knock(signalRConnection).catch(console.error);
    }
  }

  logout(): void {
    this._sharedService.clearAllStates();
    this._router.navigate(['/login']);
  }

  overridePosFinancial(): void {
    this._posService.getSelectedTerminal().subscribe((terminal) => {
      // If we get here, we have a valid terminal ID
      const startedStatus = new MasterDTO();
      startedStatus.Key = '10';
      startedStatus.Description = 'Started';

      // Make the HTTP call with the validated terminal ID
      console.log('Updating terminal status for ID:', terminal?.Account.id);
      this._terminalHttpService
        .patchTerminalDrawer(startedStatus, terminal?.Account.id ?? '')
        .pipe(
          catchError((error) => {
            console.error('Error updating terminal status:', error);

            this._snackbar.open('Fout bij initialiseren van terminal', 'OK', {
              duration: 5000,
            });

            return throwError(() => error);
          }),
        )
        .subscribe(() => {
          console.log('Terminal status updated successfully');
        });
    });
  }

  onRowClick(row: ItemSummary): void {
    if (this.clickedRows.has(row)) {
      this.clickedRows.delete(row);
    } else {
      this.clickedRows.add(row);
    }
  }

  ngOnDestroy(): void {
    console.log('DashboardComponent destroyed, unsubscribing...');
    this.unsubscribe$.next();
    this.unsubscribe$.complete();

    this.itemsSoldDataSource.data = [];
    this.stockAlertDataSource.data = [];

    this.testChart?.destroy();
    this.barChart?.destroy();
    this.paymentChart?.destroy();
    this.testChart = this.barChart = this.paymentChart = null;

    const signalRConnection: SignalRConnectionDTO = {
      id: this.sessionId ?? '',
      ShopId: this.currentPosShop.Account.id ?? '',
      TerminalId: this.selectedTerminal?.Account.id ?? '',
      UserId: this.sessionId ?? '',
      ClientName: '',
      ConnectionId: '',
      SessionId: this.sessionId ?? '',
      IsConnected: true,
      ReconnectAttempts: 0,
      Company: new CompanyDTO(),
      Groups: [],
    };

    this._signalRService.DeKnock(signalRConnection).catch(console.error);
  }

  private async tryKnock(): Promise<void> {
    const now = Date.now();
    if (now - this.lastKnockTimestamp < this.knockCooldownMs) {
      console.log('Knock request skipped due to cooldown');
      return;
    }
    this.lastKnockTimestamp = now;

    const signalRConnection: SignalRConnectionDTO = {
      id: this.sessionId ?? '',
      ShopId: this.currentPosShop.Account.id ?? '',
      TerminalId: this.selectedTerminal?.Account.id ?? '',
      UserId: this.sessionId ?? '',
      ClientName: this.selectedTerminal?.Account.Name ?? '',
      ConnectionId: this._signalRService.hubConnection.connectionId ?? '',
      SessionId: this.sessionId ?? '',
      IsConnected: true,
      ReconnectAttempts: 0,
      Company: new CompanyDTO(),
      Groups: [],
    };

    try {
      await this._signalRService.Knock(signalRConnection);
      console.log('Knock request sent successfully');
    } catch (error) {
      console.error('Knock failed:', error);
    }
  }

  private processOrderData(order: DailyReportDTO | null): void {
    if (order) {
      this.backOfficeOrder = order;
      if (
        this.backOfficeOrder.PosShops &&
        this.backOfficeOrder.PosShops.length > 0
      ) {
        this.selectedShop = this.backOfficeOrder.PosShops[0] as PosShop;
        this.setDataInCharts();
      }
      console.log('Order data processed:', order);
    } else {
      this.backOfficeOrder = null;
      console.warn('No order data available');
    }
    this.updateLoadingState(false);
  }
}

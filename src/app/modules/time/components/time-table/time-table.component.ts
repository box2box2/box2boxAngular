/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  MatPaginator,
  MatPaginatorIntl,
  MatPaginatorModule,
} from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, finalize, first, switchMap, tap } from 'rxjs/operators';
import { onKeyEnterFocusNext } from '../../../../services/key-event-utils';
import { AppActions } from '../../../../store/app.actions';
import { PosV2Service } from '../../../pos/services/pos.service';
import { MasterDataFullDTO } from '../../../shared/dtos/shared/masterData.dto';
import { EmployeeFullDTO } from '../../../shared/dtosV2/employee/employeeFull.dto';
import { WorkspaceButtonDTO } from '../../../shared/dtosV2/posShop/operatorButton.dto';
import { ShopFullDTO } from '../../../shared/dtosV2/posShop/shopFull.dto';
import { MasterDTO } from '../../../shared/dtosV2/shared/master.dto';
import { MasterEnum } from '../../../shared/enums/masterEnum';
import { SharedService } from '../../../shared/http/shared.service';
import { EmployeeHttpService } from '../../../shared/http/v2/employee.http.service';
import { ShopHttpService } from '../../../shared/http/v2/shop.http.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, NgClass } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { KeyboardComponent } from '../../../pos/common/keyboard/keyboard.component';

@Component({
  templateUrl: './time-table.component.html',
  styleUrl: './time-table.component.scss',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatToolbarModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    KeyboardComponent,
    CommonModule
  ],
})
export class TimeTableComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  searchControl = new FormControl('');
  dataSource: MatTableDataSource<EmployeeFullDTO>;
  displayedColumns: string[] = [
    'OperatorNumber',
    'OperatorName',
    'Status',
    'Color',
    'Initials',
  ];
  resultsLength = 0;
  statuses: MasterDTO[] = [];
  employeeStatuses: MasterDTO[] = [];
  buttons: WorkspaceButtonDTO[] = [];
  selectedEmployee: EmployeeFullDTO | null = null;
  selectedStatus: MasterDTO | null = null;
  selectedSlot: WorkspaceButtonDTO | null = null;
  posShop: ShopFullDTO | null = null;

  keyboardVisible = false;
  focusedControl: FormControl<string | null> | null = null;
  keyboardContext: 'username' | 'password' | 'search' = 'username';
  loading = true;
  isProcessing = false;

  #action$!: Subscription;

  constructor(
    private _cdr: ChangeDetectorRef,
    private _matPaginatorIntl: MatPaginatorIntl,
    private _sharedService: SharedService,
    private _router: Router,
    private _snackBar: MatSnackBar,
    private _posService: PosV2Service,
    private _shopHttpService: ShopHttpService,
    private _employeeHttpService: EmployeeHttpService,
  ) {
    this.dataSource = new MatTableDataSource<EmployeeFullDTO>();
    this.#action$ = this._sharedService.$actionClick
      .pipe(switchMap(() => this.getData()))
      .subscribe();
  }

  ngOnInit(): void {
    this.dataSource.filterPredicate = (
      data: EmployeeFullDTO,
      filter: string,
    ): boolean => {
      const filterValue = filter.trim().toLowerCase();
      return (
        data.Account.AccountNumber.toLowerCase().includes(filterValue) ||
        data.Account.Name.toLowerCase().includes(filterValue) ||
        data.Account.Status?.Description?.toLowerCase().includes(filterValue)
      );
    };

    this.getData().subscribe();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.paginator._intl = this._matPaginatorIntl;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    this.#action$.unsubscribe();
  }

  getData(): Observable<EmployeeFullDTO[]> {
    this.loading = true;

    return this._posService.getPosShopAccount().pipe(
      first(),
      tap((posShopAccount: ShopFullDTO) => (this.posShop = posShopAccount)),

      switchMap((posShopAccount) =>
        this._shopHttpService.getPosShopById(posShopAccount?.Account.id).pipe(
          tap((shop: ShopFullDTO) => {
            console.log('Shop:', shop);
            this.posShop = shop;
            this._posService.dispatchAppAction(
              AppActions.setPosShopAccount({ posShopAccount: shop }),
            );
          }),
        ),
      ),

      switchMap((posShopAccount: ShopFullDTO) => {
        console.log('buttons', posShopAccount.EmployeeButtons);
        console.log(
          'All buttons id`s',
          posShopAccount.EmployeeButtons.EmployeeWorkspaces.map((b) => b.id),
        );
        this.buttons = posShopAccount.EmployeeButtons.EmployeeWorkspaces;

        return this._sharedService.getMasterData(
          posShopAccount.Account.PartitionKeyCompanyId,
          [MasterEnum.EMPLOYEE_STATUS, MasterEnum.EMPLOYEE_BUTTON_STATUS],
        );
      }),

      catchError((error) => {
        console.error('Error fetching Master Data:', error);
        const emptyResponse: MasterDataFullDTO<unknown> = {
          id: '',
          Company: '',
          MasterData: [
            {
              GroupIndicator: '',
              ListOfElements: [],
            },
          ],
        };
        return of(emptyResponse);
      }),
      tap((response) => this.extractMasterData(response)),
      switchMap(() => this.setDatasource()),
      finalize(() => {
        this.loading = false;
      }),
    );
  }

  trackByButton = (index: number, item: WorkspaceButtonDTO): string =>
    `${item.id}-${item.id}-${index}`;

  setDatasource(): Observable<EmployeeFullDTO[]> {
    return this._employeeHttpService.getAllEmployees().pipe(
      tap((data) => {
        if (data) {
          console.log('All Employees:', data);
          this.resultsLength = data.length;
        }
        this.dataSource.data = data;
        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
        this._cdr.detectChanges();
        console.log('Filtered Employees:', this.dataSource.data);
      }),
    );
  }

  applyFilter(event: any): void {
    const filterValue = event.trim().toLowerCase();
    this.dataSource.filter = filterValue;
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    this.resultsLength = this.dataSource.filteredData.length;
  }

  //TODO find solution for this
  changeStatus(status: MasterDTO): void {
    // if (!this.selectedEmployee) {
    //   this._snackBar.message('❌ Geen werknemer geselecteerd.', SnackbarType.Error);
    //   return;
    // }

    // if (this.selectedEmployee.EmployeeButtonStatus === 'Clock Out' && status.Key === '200') {
    //   this._snackBar.message('⚠️ Werknemer is al uitgeklokt.', SnackbarType.Warn);
    //   return;
    // }

    // if (this.selectedEmployee.EmployeeButtonStatus === 'Clock In' && status.Key === '100') {
    //   this._snackBar.message('⚠️ Werknemer is al ingeklokt.', SnackbarType.Warn);
    //   return;
    // }

    this.selectedStatus = status;
    console.log('🔹 Status gewijzigd naar:', status.Description);

    if (status.Key === '200') {
      const confirmLogout = window.confirm(
        `Weet je zeker dat je ${this.selectedEmployee?.Account.Name} wilt uitklokken?`,
      );

      if (!confirmLogout) {
        return;
      }
      this._employeeHttpService
        .clockUserOut(
          this.posShop?.Account.id ?? '',
          this.selectedEmployee?.Account.id as string,
        )
        .subscribe({
          next: (updatedPosShop: ShopFullDTO) => {
            this.posShop = updatedPosShop;
            this._posService.dispatchAppAction(
              AppActions.setPosShopAccount({ posShopAccount: updatedPosShop }),
            );
            this._router.navigate(['']);
          },
          error: (error) => {
            console.error('❌ API Error Response:', error);
          },
        })
        .add(() => (this.isProcessing = false));
    } else if (status.Key === '100') {
      return;
    }

    this._cdr.detectChanges();
  }

  setUserSlot(slot: WorkspaceButtonDTO): void {
    // this.selectedSlot = slot;
    // if (this.isProcessing) {
    //   this._snackBar.message('⚠️ Bezig met verwerken... Probeer later opnieuw.', SnackbarType.Warn);
    //   return;
    // }

    // if (!this.selectedEmployee) {
    //   this._snackBar.message('❌ Geen werknemer geselecteerd.', SnackbarType.Error);
    //   return;
    // }

    // if (!this.selectedStatus) {
    //   this._snackBar.message('❌ Geen status geselecteerd.', SnackbarType.Error);
    //   return;
    // }

    // if (!slot || !slot.id) {
    //   this._snackBar.message('❌ Ongeldige knop (slot).', SnackbarType.Error);
    //   console.error('❌ slot is null of heeft geen Key:', slot);
    //   return;
    // }

    // if (this.selectedSlot && this.selectedSlot.id !== slot.id) {
    //   this._snackBar.message(`⚠️ Werknemer is al ingeklokt op ${this.selectedSlot.Description} en kan niet wisselen.`, SnackbarType.Warn);
    //   return;
    // }

    // if (this.selectedStatus.id === '200' && this.selectedSlot?.id !== slot.id) {
    //   this._snackBar.message(`⚠️ Kan niet uitklokken op een andere locatie dan ${this.selectedSlot?.Description}.`, SnackbarType.Warn);
    //   return;
    // }

    this.isProcessing = true;

    this._employeeHttpService
      .setUserSlot(
        this.posShop?.Account.id ?? '',
        this.selectedStatus?.Key ?? '',
        this.selectedEmployee?.Account.id as string,
        slot.id,
      )
      .subscribe({
        next: (updatedPosShop: ShopFullDTO) => {
          this._snackBar.open('✅ Status succesvol bijgewerkt!');
          this.posShop = updatedPosShop;
          this._posService.dispatchAppAction(
            AppActions.setPosShopAccount({ posShopAccount: updatedPosShop }),
          );
          this._router.navigate(['']);
        },
        error: (error) => {
          this._snackBar.open('❌ Fout bij opslaan van status.');
          console.error('❌ API Error Response:', error);
        },
      })
      .add(() => (this.isProcessing = false));
  }

  // TODO won't work in set setup
  getEmployeeOnSlot(button: WorkspaceButtonDTO): string {
    const employee = this.dataSource.data.find(
      (emp) => emp.Account.Name === button.id,
    );
    return employee ? employee.Account.Name : 'Onbekend';
  }

  selectRow(employee: EmployeeFullDTO): void {
    this.selectedEmployee = employee;
    console.log('Selected Employee:', employee);
  }

  showKeyboard(
    control: FormControl<string | null>,
    context: 'username' | 'password' | 'search',
  ): void {
    this.focusedControl = control;
    this.keyboardContext = context;
    this.keyboardVisible = true;
  }

  onFocus(control: FormControl<string | null>): void {
    this.focusedControl = control;
    this.keyboardVisible = true;
  }

  maybeHideKeyboard(event: FocusEvent): void {
    const relatedTarget = event.relatedTarget as HTMLElement | null;
    const keyboardEl = document.querySelector('app-keyboard');
    if (!keyboardEl?.contains(relatedTarget)) {
      this.keyboardVisible = false;
      this.focusedControl = null;
    }
  }

  onKeyboardEnter(value: string | undefined): void {
    if (this.keyboardContext === 'search') {
      this.searchControl.setValue(value || null);
      this.applyFilter(value || '');
    }
  }

  onKeyboardTyping(value: string | null): void {
    if (this.keyboardContext === 'search' && value !== null) {
      this.searchControl.setValue(value);
      this.applyFilter(value);
    }
  }

  handleKey(event: KeyboardEvent): void {
    onKeyEnterFocusNext(event);
  }

  private extractMasterData(response: MasterDataFullDTO<unknown>): void {
    const masterDataGroups = response?.MasterData || [];
    const employeeStatusGroup = masterDataGroups.find(
      (group: any) => group.GroupIndicator === 'PosEmployeeStatus',
    );
    const buttonStatusGroup = masterDataGroups.find(
      (group: any) => group.GroupIndicator === 'PosEmployeeButtonStatus',
    );
    this.employeeStatuses = (employeeStatusGroup?.ListOfElements ||
      []) as MasterDTO[];
    this.statuses = (buttonStatusGroup?.ListOfElements || []) as MasterDTO[];
    this._cdr.detectChanges();
  }
}

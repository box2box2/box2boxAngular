import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { catchError, of, Subject, switchMap, takeUntil, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SharedService } from '../../modules/shared/http/shared.service';
import { ShopHttpService } from '../../modules/shared/http/v2/shop.http.service';
import { TerminalHttpService } from '../../modules/shared/http/v2/terminal.http.service';
import { DateService } from '../../services/date-util.services';
import { onKeyEnterFocusNext } from '../../services/key-event-utils';
import { AppActions } from '../../store/app.actions';

@Component({
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  animations: [
    trigger('enterLogin', [transition(':enter', [style({ transform: 'translateX(20%)', opacity: 0 }), animate('120ms ease-out')])])
  ]
})
export class LoginComponent implements OnDestroy, AfterViewInit {
  @ViewChild('usernameInput') usernameInput!: ElementRef<HTMLInputElement>;
  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;
  @ViewChild('loginButton') loginButton!: ElementRef<HTMLButtonElement>;
  @ViewChild('loginFormElement') loginFormElement!: ElementRef<HTMLFormElement>;
  keyboardContext: 'username' | 'password' = 'username';
  focusedInput: ElementRef<HTMLInputElement> | null = null;
  public hide = true;
  loggingIn = false;
  caretPosition = 0;
  selectionEnd = 0;
  liveValue = '';
  oValue = new EventEmitter<string | null>();
  public version = environment.version;
  loginForm: FormGroup<{ username: FormControl<string | null>; password: FormControl<string | null> }>;
  terminal!: TerminalFullDTO;
  keyboardVisible = false;
  focusedControl: FormControl<string | null> | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private _sharedService: SharedService,
    private _router: Router,
    private _fb: FormBuilder,
    private _posService: PosV2Service,
    private _dialogService: DialogService,
    private _terminalHttpService: TerminalHttpService,
    private _shopHttpService: ShopHttpService
  ) {
    this.loginForm = this._fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get usernameControl(): FormControl<string | null> {
    return this.loginForm.get('username') as FormControl<string | null>;
  }

  get passwordControl(): FormControl<string | null> {
    return this.loginForm.get('password') as FormControl<string | null>;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.usernameControl.value) {
        this.usernameInput.nativeElement.focus();
      }
    }, 1000);
  }

  login(): void {
    this.loggingIn = true;

    if (!this.loginForm.valid) {
      this.loggingIn = false;
      return;
    }

    const loginParams: LoginDTO = {
      username: this.loginForm.controls.username?.value as string,
      password: this.loginForm.controls.password?.value as string
    };

    this._sharedService
      .cosmosLogin(loginParams.username, loginParams.password)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(loginResult => {
          if (!loginResult || !loginResult.access_token) {
            return throwError(() => new Error('Login failed'));
          }

          loginResult.createdAt = DateService.getNowUtc();
          this._posService.dispatchAppAction(AppActions.setToken({ token: loginResult }));
          this._posService.dispatchAppAction(AppActions.setUsername({ username: loginParams.username }));

          return this._terminalHttpService.getTerminalById(loginResult.accountId).pipe(
            tap(terminal => {
              this.terminal = terminal;
              this._posService.dispatchPosAction(PosActions.setTerminal({ terminal }));
            }),
            switchMap(terminal => {
              if (!terminal?.Terminal.ShopAccount.id) {
                return throwError(() => new Error('Invalid terminal data'));
              }

              return this._shopHttpService.getPosShopById(terminal.Terminal.ShopAccount.id).pipe(
                tap(shop => {
                  this._posService.dispatchAppAction(AppActions.setPosShopAccount({ posShopAccount: shop }));
                  this._posService.dispatchPosAction(PosActions.setEmployee({ employee: null }));
                  this._posService.dispatchPosAction(PosActions.setPosOrder({ order: null }));
                })
              );
            })
          );
        }),
        catchError(error => {
          this.loggingIn = false;
          console.error('Login failed:', error);
          return of(null);
        })
      )
      .subscribe(loginResult => {
        if (!loginResult) {
          return;
        }

        this.loggingIn = false;
        const validSettings = this.validateTerminalSettings(this.terminal);

        if (!validSettings) {
          this._dialogService
            .openConfirmDialogSimple({
              title: 'Instellingen ontbreken voor printer of kassa of pin',
              message: 'Doorgaan?',
              actions: [['Ok', 'primary']],
              alert: DialogAlert.ALERT
            })
            .afterClosed()
            .pipe(takeUntil(this.destroy$))
            .subscribe(continueLogin => {
              if (continueLogin) {
                this._router.navigate(['/']);
              } else {
                this._sharedService.clearAllStates();
                this._router.navigate(['/login']);
              }
            });
        } else {
          this._router.navigate(['/']);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  validateTerminalSettings(terminal: TerminalFullDTO): boolean {
    const settings = terminal.Settings;
    // Check if there are drawer settings
    const drawerSettings = settings.filter((setting) => setting.Key === '990');

    // Check if there are printer settings
    const printerSettings = settings.filter((setting) => setting.Key === '992');

    // Check if there are printer settings
    const pinSettings = settings.filter((setting) => setting.Key === '995');

    // Check if there are printer settings
    const labelPrinterSettings = settings.filter((setting) => setting.Key === '991');

    if (drawerSettings.length === 0 || printerSettings.length === 0 || pinSettings.length === 0 || labelPrinterSettings.length === 0) {
      return false;
    } else {
      return true;
    }
  }

  showKeyboard(control: FormControl<string | null>, context: 'username' | 'password'): void {
    if (context === 'username' && this.keyboardContext !== 'username') {
      this.liveValue = '';
    }

    const inputEl = context === 'username' ? this.usernameInput.nativeElement : this.passwordInput.nativeElement;

    this.focusedInput = new ElementRef(inputEl);
    this.focusedControl = control;
    this.keyboardContext = context;

    this.caretPosition = inputEl.selectionStart ?? 0;
    this.selectionEnd = inputEl.selectionEnd ?? this.caretPosition;

    this.keyboardVisible = true;
    this.focusedControl.setValue(inputEl.value);
  }

  onFocus(control: FormControl<string | null>): void {
    this.focusedControl = control;
    this.keyboardVisible = true;
    this.liveValue = '';
    this.onLiveValueChange('');
  }

  onLiveValueChange(value: string): void {
    console.log('Live value veranderd:', value);
    if (this.keyboardContext === 'username') {
      this.usernameControl.setValue(value);
    } else if (this.keyboardContext === 'password') {
      this.passwordControl.setValue(value);
    }
  }

  onKeyboardEnter(value: string): void {
    console.log('Waarde ontvangen in onKeyboardEnter:', value);

    if (this.keyboardContext === 'username') {
      this.usernameControl.setValue(value);
      this.usernameControl.updateValueAndValidity();
    } else if (this.keyboardContext === 'password') {
      this.passwordControl.setValue(value);
      this.passwordControl.updateValueAndValidity();
    }

    this.liveValue = value;
    this.oValue.emit(value);

    this.liveValue = '';
    this.oValue.emit('');
  }

  handleKey(event: KeyboardEvent): void {
    onKeyEnterFocusNext(event);
  }

  handleVirtualEnter(): void {
    console.log('[LoginComponent] handleVirtualEnter() triggered');

    const currentInput = this.focusedInput?.nativeElement;
    if (!currentInput) return;

    const form = currentInput.closest('form') ?? this.loginFormElement.nativeElement;

    const focusable = Array.from(
      form.querySelectorAll<HTMLElement>('input:not([disabled]):not([tabindex="-1"]), textarea, select, button')
    ).filter(el => el.offsetParent !== null);

    const currentIndex = focusable.indexOf(currentInput);
    const next = focusable[currentIndex + 1];

    if (next && next instanceof HTMLInputElement) {
      next.focus();

      this.focusedInput = new ElementRef(next);

      if (next === this.usernameInput.nativeElement) {
        this.showKeyboard(this.usernameControl, 'username');
      } else if (next === this.passwordInput.nativeElement) {
        this.showKeyboard(this.passwordControl, 'password');
      }
    } else {
      this.loginFormElement.nativeElement.requestSubmit();
      this.keyboardVisible = false;
    }
  }

  focusNext(): void {
    if (this.keyboardContext === 'username') {
      this.liveValue = '';
      this.oValue.emit(this.liveValue);
      this.focusedControl = this.passwordControl;
      this.keyboardContext = 'password';
      this.caretPosition = this.passwordInput.nativeElement.selectionStart ?? 0;
      this.selectionEnd = this.passwordInput.nativeElement.selectionEnd ?? this.caretPosition;

      this.focusedInput = this.passwordInput;

      setTimeout(() => {
        this.passwordInput.nativeElement.focus();
        this.showKeyboard(this.passwordControl, 'password');
      });
    } else if (this.keyboardContext === 'password') {
      this.keyboardVisible = false;

      setTimeout(() => {
        this.loginFormElement.nativeElement.requestSubmit();
      });
    }
  }
}

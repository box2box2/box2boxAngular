/* eslint-disable @angular-eslint/component-class-suffix */
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  shouldShowSearchAndMenu = true;
  protected title = 'pos';
  constructor(private _translate: TranslateService) {
    _translate.setDefaultLang('nl');
    _translate.use('nl');
  }

  useLanguage(language: string): void {
    this._translate.use(language);
  }
}

/* eslint-disable @angular-eslint/component-class-suffix */
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { VersionService } from './services/version.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App implements OnInit {
  shouldShowSearchAndMenu = true;
  protected title = 'pos';
  constructor(private _translate: TranslateService, private _versionService: VersionService) {
    _translate.setDefaultLang('nl');
    _translate.use('nl');
  }

  async ngOnInit(): Promise<void> {
    await this._versionService.loadLocalVersion();
  }

  checkForUpdates(): void {
    this._versionService.checkRemoteVersion();
  }

  useLanguage(language: string): void {
    this._translate.use(language);
  }
}

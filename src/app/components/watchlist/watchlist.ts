import { Component, OnInit } from '@angular/core';
import { WatchlistDTO } from '../../modules/shared/models/watchlist.dto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MarketService } from '../../modules/shared/http/market.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { HeaderComponent } from '../header/header.component';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-watchlist',
  imports: [CommonModule, MatCardModule, HeaderComponent, MatButton],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.scss',
})
export class WatchlistComponent implements OnInit {
  watchlist: WatchlistDTO[] = [];

  constructor(
    private _marketService: MarketService,
    private _snackbar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this._marketService.getWatchlist().subscribe((data) => {
      this.watchlist = data;
      console.log('watchlist fetched:', this.watchlist);
      this._snackbar.open('Watchlist loaded', 'Close', { duration: 2000 });
    });
  }

  refresh(): void {
    this._marketService.getWatchlist().subscribe((data) => {
      this.watchlist = data;
      console.log('watchlist refreshed:', this.watchlist);
      this._snackbar.open('watchlist refreshed', 'Close', { duration: 2000 });
    });
  }

  back(): void {
    window.history.back();
  }
}

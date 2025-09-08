import { Component, OnInit } from '@angular/core';
import { WatchlistDTO } from '../../modules/shared/models/watchlist.dto';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MarketService } from '../../modules/shared/http/market.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-watchlist',
  imports: [
    CommonModule,
    MatCardModule,
    MatButton,
    MatChipsModule,
    MatIconModule,
  ],
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

  remove(item: WatchlistDTO): void {
    //this._marketService.removeFromWatchlist(item.Id).subscribe(() => {
    //  this.watchlist = this.watchlist.filter(w => w.Id !== item.Id);
    this._snackbar.open(`Removed ${item.Symbol} from watchlist`, 'Close', {
      duration: 2000,
    });
    //});
  }
}

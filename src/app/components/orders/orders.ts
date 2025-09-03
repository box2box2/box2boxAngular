import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MarketService } from '../../modules/shared/http/market.service';
import { OrderModel } from '../../modules/shared/models/TradeOrders.dto';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-orders',
  imports: [
    MatCardModule,
    MatButtonModule,
    CommonModule,
    HeaderComponent,
    HeaderComponent,
    MatSnackBarModule,
  ],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class OrdersComponent implements OnInit {
  orders: OrderModel[] = [];

  constructor(
    private _marketService: MarketService,
    private _snackbar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this._marketService.getTradeOrders().subscribe((data) => {
      this.orders = data.Orders;
      console.log('Orders fetched:', this.orders);
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'NEW':
        return 'accent';
      case 'TARGET1':
        return 'primary';
      case 'TARGET2':
        return 'warn';
      default:
        return '';
    }
  }

  deleteOrder(orderId: number): void {
    this._marketService.deleteOrder(orderId).subscribe(() => {
      this.orders = this.orders.filter((order) => order.Id !== orderId);
      console.log(`Order with ID ${orderId} deleted.`);
    });
  }

  refresh(): void {
    this._marketService.getTradeOrders().subscribe((data) => {
      this.orders = data.Orders;
      console.log('Orders refreshed:', this.orders);
      this._snackbar.open('Orders refreshed', 'Close', { duration: 2000 });
    });
  }

  back(): void {
    window.history.back();
  }
}

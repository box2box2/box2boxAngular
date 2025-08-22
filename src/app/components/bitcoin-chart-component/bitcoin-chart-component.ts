import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration } from 'chart.js';

@Component({
  selector: 'app-bitcoin-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div style="display:block;">
      <canvas
        baseChart
        [data]="lineChartData"
        [options]="lineChartOptions"
        [type]="'line'"
      >
      </canvas>
    </div>
  `,
})
export class BitcoinChartComponent implements OnInit {
  btcPrices: number[] = [41000, 41500, 42000, 41800, 42250, 43000, 42800];
  btcLabels: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: this.btcLabels,
    datasets: [
      {
        data: this.btcPrices,
        label: 'Bitcoin Price (USD)',
        fill: true,
        borderColor: '#f2a900',
        backgroundColor: 'rgba(242,169,0,0.3)',
        tension: 0.4,
      },
    ],
  };

  lineChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
      },
    },
    scales: {
      x: {},
      y: {
        beginAtZero: false,
      },
    },
  };

  ngOnInit(): void {
    // Optional: fetch live BTC data here
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { Chart, ChartConfiguration } from 'chart.js';
import 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';

import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';

Chart.register(CandlestickController, CandlestickElement);

@Component({
  selector: 'app-bitcoin-candle-chart',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: 'bitcoin-candle-chart-component.html',
})
export class BitcoinCandleChartComponent implements OnInit {
  chartData: ChartConfiguration<'candlestick'>['data'] = {
    datasets: [
      {
        label: 'BTC/USDT',
        data: [
          {
            x: new Date('2025-08-16').getTime(),
            o: 42000,
            h: 42500,
            l: 41500,
            c: 42200,
          },
          {
            x: new Date('2025-08-17').getTime(),
            o: 42200,
            h: 43000,
            l: 42000,
            c: 42800,
          },
          {
            x: new Date('2025-08-18').getTime(),
            o: 42800,
            h: 43200,
            l: 42600,
            c: 43000,
          },
          {
            x: new Date('2025-08-19').getTime(),
            o: 43000,
            h: 43500,
            l: 42800,
            c: 43200,
          },
        ],
      },
    ],
  };

  chartOptions: ChartConfiguration<'candlestick'>['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
    },
    scales: {
      x: {
        type: 'time', // 👈 requires date adapter
        time: {
          unit: 'day',
          tooltipFormat: 'MMM dd',
        },
      },
      y: {
        beginAtZero: false,
      },
    },
  };

  ngOnInit(): void {
    //
  }
}

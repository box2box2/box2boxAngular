/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { NgChartsModule } from 'ng2-charts';

import {
  Chart as ChartJS,
  TimeScale,
  Tooltip,
  Legend,
  Title,
  LinearScale,
} from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';

// Register Chart.js plugins and controllers
ChartJS.register(
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
  Title,
  CandlestickController,
  CandlestickElement,
  zoomPlugin,
);

@Component({
  selector: 'app-chart-test-component',
  standalone: true,
  imports: [
    CommonModule,
    NgChartsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  templateUrl: './chart-test-component.html',
  styleUrls: ['./chart-test-component.scss'],
})
export class ChartTestComponent {
  chartData: any = {
    datasets: [
      {
        label: 'UMB/USDT',
        data: [
          {
            x: new Date('2023-08-25'),
            o: 0.0025,
            h: 0.0028,
            l: 0.0024,
            c: 0.0026,
          },
          {
            x: new Date('2023-08-26'),
            o: 0.0026,
            h: 0.0027,
            l: 0.0023,
            c: 0.0024,
          },
          {
            x: new Date('2023-08-27'),
            o: 0.0024,
            h: 0.0025,
            l: 0.0021,
            c: 0.0022,
          },
          {
            x: new Date('2023-08-28'),
            o: 0.0022,
            h: 0.0023,
            l: 0.002,
            c: 0.0021,
          },
        ],
        type: 'candlestick',
      },
    ],
  };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { mode: 'index', intersect: false },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x', // allow panning on x-axis
        },
        zoom: {
          wheel: {
            enabled: true, // zoom with mouse wheel
          },
          pinch: {
            enabled: true, // zoom with pinch gesture on mobile
          },
          mode: 'x', // zoom along x-axis
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: { unit: 'day', tooltipFormat: 'MMM dd' },
        ticks: { autoSkip: true, maxRotation: 0 },
      },
      y: {
        beginAtZero: false,
        ticks: { callback: (val: any) => val.toFixed(6) },
      },
    },
  };

  resetZoom(): void {
    const chart = ChartJS.getChart('0'); // grabs the first chart
    if (chart) {
      (chart as any).resetZoom();
    }
  }
}

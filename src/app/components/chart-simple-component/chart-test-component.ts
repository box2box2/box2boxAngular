/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgChartsModule, BaseChartDirective } from 'ng2-charts';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';

import {
  Chart as ChartJS,
  TimeScale,
  LinearScale,
  Tooltip,
  Title,
  Legend,
} from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';
import zoomPlugin from 'chartjs-plugin-zoom';
import 'chartjs-adapter-date-fns';
import {
  MarketService,
  SymbolModel,
} from '../../modules/shared/http/market.service';

//
// 📍 Crosshair plugin
//
const crosshairPlugin = {
  id: 'crosshair',
  afterDraw(chart: any): void {
    if (chart.tooltip?._active?.length) {
      const ctx = chart.ctx;
      const x = chart.tooltip._active[0].element.x;
      const y = chart.tooltip._active[0].element.y;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x, chart.chartArea.top);
      ctx.lineTo(x, chart.chartArea.bottom);
      ctx.moveTo(chart.chartArea.left, y);
      ctx.lineTo(chart.chartArea.right, y);
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = '#555';
      ctx.stroke();
      ctx.restore();
    }
  },
};

ChartJS.register(
  TimeScale,
  LinearScale,
  Tooltip,
  Title,
  Legend,
  CandlestickController,
  CandlestickElement,
  zoomPlugin,
  crosshairPlugin,
);

ChartJS.defaults.datasets.line.clip = false;

(zoomPlugin as any).defaults.pan.display = false;
(zoomPlugin as any).defaults.zoom.display = false;

@Component({
  selector: 'app-chart-simple',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgChartsModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
  templateUrl: 'chart-simple-component.html',
  styleUrls: ['chart-simple-component.scss'],
})
export class ChartSimpleComponent implements OnInit {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  chartData: any = { datasets: [] };
  boxes: any[] = [];
  symbols: SymbolModel[] = [];
  selectedSymbol: SymbolModel = new SymbolModel(); // ✅ now full object
  showBoxes = true;
  showSettings = false;
  baseData: any[] = [];

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: window.innerWidth > 768,
        mode: 'index',
        intersect: false,
      },
      datalabels: { display: false },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy',
          threshold: 10,
          overScaleMode: 'none',
        },
        zoom: {
          wheel: { enabled: true, speed: 0.05 },
          pinch: { enabled: true },
          drag: { enabled: true },
          mode: 'xy',
          overScaleMode: 'none',
          limits: {
            x: { minRange: 1000 },
            y: { minRange: 0.00001 },
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'MMM dd',
          displayFormats: { day: 'MMM dd' },
        },
        grid: { color: '#2a2a2a', borderColor: '#555' },
        ticks: {
          color: '#aaa',
          autoSkip: true,
          maxTicksLimit: window.innerWidth < 500 ? 4 : 8,
        },
      },
      y: {
        position: 'right',
        beginAtZero: false,
        grid: { color: '#2a2a2a', borderColor: '#555' },
        ticks: {
          color: '#aaa',
          callback: (val: any) => this.formatYAxisTicks(Number(val)),
          maxTicksLimit: 12,
        },
        afterBuildTicks: (axis: any) =>
          (axis.ticks = axis.ticks.filter((_: any, i: number) => i % 2 === 0)),
      },
    },
    layout: { backgroundColor: '#0d1117' },
  };

  constructor(
    private marketService: MarketService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.marketService.getSymbols().subscribe((symbols) => {
      this.symbols = symbols;
      if (!symbols?.length) return;

      // ✅ Subscribe to route param
      this.route.paramMap.subscribe((params) => {
        const routeSymbol = params.get('symbol');

        if (routeSymbol) {
          const found = this.symbols.find(
            (s) => s.SymbolName.toUpperCase() === routeSymbol.toUpperCase(),
          );
          this.selectedSymbol = found || this.symbols[0];
        } else {
          // ✅ fallback: BTCUSDT (Id 1392)
          const btc = this.symbols.find((s) => s.Id === 1392);
          this.selectedSymbol = btc || this.symbols[0];
        }

        console.log('📈 Selected symbol:', this.selectedSymbol.SymbolName);
        this.loadCandles(this.selectedSymbol.SymbolName);
      });
    });
  }

  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  onBoxesToggle(): void {
    console.log('🟡 onBoxesToggle triggered. showBoxes =', this.showBoxes);
    if (this.showBoxes) {
      if (this.boxes.length) {
        this.addBoxesDatasets(this.baseData);
      } else if (this.selectedSymbol?.SymbolName) {
        this.marketService
          .getBoxesV2(this.selectedSymbol.SymbolName, '1d')
          .subscribe({
            next: (boxes) => {
              this.boxes = boxes.filter(
                (b: any) =>
                  ((b.Type || b.type || '') + '').toLowerCase() === 'range',
              );
              if (this.boxes.length && this.baseData.length) {
                this.addBoxesDatasets(this.baseData);
              }
            },
          });
      }
    } else {
      // ✅ Hide boxes
      this.chartData.datasets = this.chartData.datasets.filter(
        (d: any) => !d.label?.startsWith('Box'),
      );
      this.chart?.update();
    }
  }

  //
  // ✅ Symbol selector change
  //
  onSymbolChange(symbol: SymbolModel): void {
    this.selectedSymbol = symbol;
    this.loadCandles(symbol.SymbolName);
  }

  //
  // 📈 Load candles and overlay boxes
  //
  loadCandles(symbolName: string): void {
    this.marketService
      .getCandles(symbolName, '1d', 1000)
      .subscribe((candles) => {
        const mapped = candles.map((c) => ({
          x: new Date(c.Time).getTime(),
          o: c.Open,
          h: c.High,
          l: c.Low,
          c: c.Close,
        }));
        this.baseData = mapped;

        if (!mapped.length) return;

        const visible = mapped.slice(-150);
        const xMin = visible[0].x;
        const xMax = visible[visible.length - 1].x;
        const yMin = Math.min(...visible.map((c) => c.l));
        const yMax = Math.max(...visible.map((c) => c.h));

        this.chartData = {
          datasets: [
            {
              label: `${symbolName} 1D`,
              data: mapped,
              type: 'candlestick',
              borderColor: {
                up: '#26a69a',
                down: '#ef5350',
                unchanged: '#999',
              },
              backgroundColor: {
                up: '#26a69a',
                down: '#ef5350',
                unchanged: '#999',
              },
            },
          ],
        };

        // ✅ Load boxes if enabled
        if (this.showBoxes) {
          this.marketService.getBoxesV2(symbolName, '1d').subscribe((boxes) => {
            this.boxes = boxes.filter(
              (b: any) =>
                ((b.Type || b.type || '') + '').toLowerCase() === 'range',
            );
            this.addBoxesDatasets(mapped);
          });
        }

        setTimeout(() => {
          const chartRef = this.chart?.chart as any;
          if (!chartRef) return;
          chartRef.resetZoom();
          chartRef.scales.x.options.min = xMin;
          chartRef.scales.x.options.max = xMax;
          const yScale = chartRef.scales['y'];
          if (yScale?.options) {
            const buffer = (yMax - yMin) * 0.1;
            yScale.options.min = yMin - buffer;
            yScale.options.max = yMax + buffer;
          }
          const fullMin = mapped[0].x;
          const fullMax = mapped[mapped.length - 1].x;
          chartRef.options.plugins.zoom.limits = {
            ...chartRef.options.plugins.zoom.limits,
            x: { min: fullMin, max: fullMax, minRange: 1000 },
          };
          chartRef.update('none');
        }, 200);
      });
  }

  addBoxesDatasets(mapped: any[]): void {
    if (!this.boxes?.length) return;

    const xMin = mapped[0].x;
    const xMax = mapped[mapped.length - 1].x;

    const overlays = this.boxes.map((b) => ({
      type: 'line' as const,
      label: `Box ${b.Id}`,
      data: [
        { x: xMin, y: b.ZoneMin },
        { x: xMax, y: b.ZoneMin },
        { x: xMax, y: b.ZoneMax },
        { x: xMin, y: b.ZoneMax },
        { x: xMin, y: b.ZoneMin },
      ],
      parsing: false,
      xAxisID: 'x',
      yAxisID: 'y',
      borderColor:
        b.PositionType?.toUpperCase() === 'SHORT'
          ? 'rgba(255,0,0,0.9)'
          : 'rgba(0,200,0,0.9)',
      borderWidth: 1.5,
      backgroundColor:
        b.PositionType?.toUpperCase() === 'SHORT'
          ? 'rgba(255,0,0,0.15)'
          : 'rgba(0,200,0,0.15)',
      fill: true,
      tension: 0,
      pointRadius: 0,
      order: 0,
    }));

    // ensure candle dataset has higher order
    this.chartData.datasets = this.chartData.datasets.map((ds: any) =>
      ds.type === 'candlestick' ? { ...ds, order: 1 } : ds,
    );

    this.chartData.datasets = this.chartData.datasets.filter(
      (d: any) => !d.label?.startsWith('Box'),
    );

    this.chartData.datasets.push(...overlays);
    this.chart?.update();
  }

  onChartDblClick(): void {
    this.chart?.chart?.resetZoom();
  }

  formatYAxisTicks(value: number): string {
    // If value > 1000 → show no decimals
    if (value >= 1000) return value.toFixed(0);

    // If between 1 and 1000 → 2 decimals
    if (value >= 1) return value.toFixed(2);

    // If between 0.01 and 1 → 4 decimals
    if (value >= 0.01) return value.toFixed(4);

    // Otherwise → show up to 8 decimals (for crypto pairs like BTC/USDT)
    return value.toFixed(8);
  }
}

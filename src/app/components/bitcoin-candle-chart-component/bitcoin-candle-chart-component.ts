/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import {
  MarketService,
  Candle,
  SymbolModel,
  FibLevel,
  EmaMmaLevel,
  VolumeProfile,
} from '../../modules/shared/http/market.service';

import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';

Chart.register(CandlestickController, CandlestickElement);

@Component({
  selector: 'app-bitcoin-candle-chart',
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
  templateUrl: 'bitcoin-candle-chart-component.html',
})
export class BitcoinCandleChartComponent implements OnInit, AfterViewInit {
  // access the chart instance for reset
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  availableTimeframes = ['30m', '1h', '4h', '1d', '1w', '1y'];
  selectedTimeframe = '1h';
  symbols: SymbolModel[] = [];
  selectedSymbol = 'BTCUSDT';
  // overlay toggles
  showFib = false;
  showVolumeProfile = false;
  showEmaMma = false;
  showVwap = false;

  // cached levels
  fibLevels: FibLevel[] = [];
  emaMmaLevels: EmaMmaLevel[] = [];
  volumeProfiles: VolumeProfile[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartData: any = {
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

  // allow zoom plugin options by using a permissive any here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  chartOptions: any = {
    responsive: true,
    plugins: {
      legend: { display: true },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
          // require a small drag distance to start panning to avoid jitter
          threshold: 10,
          // update the chart during/after pan to ensure visuals sync
          // use plugin callback signature: ({chart}) => void
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          onPan: ({ chart }: { chart: any }) => {
            try {
              chart.update();
            } catch {
              // ignore
            }
          },
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x',
        },
      },
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

  // how many datasets are main (candlestick) so we can slice overlays off
  private mainDatasetCount = 1;

  constructor(private market: MarketService) {}

  async ngAfterViewInit(): Promise<void> {
    // try to dynamically import/register the zoom plugin if it's installed
    try {
      // dynamic import works in the browser build if the package is installed
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mod = await import('chartjs-plugin-zoom');
      // register default export or module itself
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      Chart.register((mod && (mod.default || mod)) as any);
    } catch {
      // plugin not installed or import failed - ignore
    }
  }

  resetZoom(): void {
    try {
      // plugin augments Chart instance at runtime; cast to any to call
      (this.chart?.chart as any)?.resetZoom?.();
      this.chart?.update();
    } catch {
      // ignore if method missing
    }
  }

  ngOnInit(): void {
    // Load symbols and initial candles
    this.loadSymbols();
    this.loadCandles();
  }

  loadSymbols(): void {
    this.market.getSymbols().subscribe((arr) => {
      this.symbols = arr;
      // default select first if present and not already set
      if (arr.length && !this.selectedSymbol) {
        this.selectedSymbol = arr[0].SymbolName;
      }
    });
  }

  loadCandles(limit = 100): void {
    if (!this.selectedSymbol) return;
    this.market
      .getCandles(this.selectedSymbol, this.selectedTimeframe, limit)
      .subscribe((c) => {
        this.mapCandlesToChartData(c || []);
  // after candles load, refresh overlays (will load levels if needed)
  this.refreshOverlays();
      });
  }
  onSymbolChange(symbol: string): void {
    this.selectedSymbol = symbol;
    this.loadCandles();
  }

  onTimeframeChange(tf: string): void {
    this.selectedTimeframe = tf;
    this.loadCandles();
  }

  toggleFib(checked: boolean): void {
    this.showFib = checked;
  if (checked && !this.fibLevels.length) this.loadFibLevels();
  else this.refreshOverlays();
  }

  toggleEmaMma(checked: boolean): void {
    this.showEmaMma = checked;
    if (checked && !this.emaMmaLevels.length) this.loadEmaMmaLevels();
    else this.refreshOverlays();
  }

  toggleVolumeProfile(checked: boolean): void {
    this.showVolumeProfile = checked;
    if (checked && !this.volumeProfiles.length) this.loadVolumeProfiles();
    else this.refreshOverlays();
  }

  toggleVwap(checked: boolean): void {
    this.showVwap = checked;
    // VWAP data is included in the emaMma endpoint; ensure it's loaded
    if (checked && !this.emaMmaLevels.length) this.loadEmaMmaLevels();
    else this.refreshOverlays();
  }

  private loadFibLevels(): void {
    this.market
      .getFibLevels(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.fibLevels = arr || [];
  this.refreshOverlays();
      });
  }

  private loadEmaMmaLevels(): void {
    this.market
      .getEmaMmaLevels(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.emaMmaLevels = arr || [];
  this.refreshOverlays();
      });
  }

  private loadVolumeProfiles(): void {
    this.market
      .getVolumeProfiles(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.volumeProfiles = arr || [];
        // debug: show how many profiles arrived
        console.debug('loadVolumeProfiles: got', this.volumeProfiles?.length);
  this.refreshOverlays();
      });
  }

  private addFibDatasets(): void {
    const overlays = this.fibLevels.map((f) => ({
      type: 'line' as const,
      label: `Fib ${f.Level}`,
      data: this.horizontalLineData(f.Price),
      borderColor: 'rgba(255,165,0,0.9)',
      borderWidth: 1,
      borderDash: [6, 4],
      pointRadius: 0,
      tension: 0,
    }));
    (this.chartData.datasets as unknown as unknown[]).push(
      ...(overlays as unknown[]),
    );
    // reassign chartData to trigger ng2-charts change detection
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
  }

  private addEmaMmaDatasets(): void {
    // Decide which EMA/MMA items to include:
    // - If showVwap=true => include only VWAP / RVWAP types
    // - Else if showEmaMma=true => include all non-VWAP types
    const vwapTypes = ['VWAP', 'RVWAP'];
    let emaItems = this.emaMmaLevels;
    if (this.showVwap) {
      emaItems = this.emaMmaLevels.filter((e) => vwapTypes.includes((e.Type || '').toUpperCase()));
    } else if (this.showEmaMma) {
      emaItems = this.emaMmaLevels.filter((e) => !vwapTypes.includes((e.Type || '').toUpperCase()));
    } else {
      emaItems = [];
    }
    const overlays = emaItems.map((e) => ({
      type: 'line' as const,
      label: `${e.Type} ${e.Period ?? ''}`,
      data: this.horizontalLineData(e.Value),
      borderColor: 'rgba(0,128,255,0.9)',
      borderWidth: 1,
      pointRadius: 0,
      tension: 0,
    }));
    (this.chartData.datasets as unknown as unknown[]).push(
      ...(overlays as unknown[]),
    );
    // reassign chartData to trigger ng2-charts change detection
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
  }

  private addVolumeProfileDatasets(): void {
  // volume-profile overlays use preloaded volumeProfiles
    const overlays: unknown[] = [];
    this.volumeProfiles.forEach((v) => {
      overlays.push({
        type: 'line' as const,
        label: 'POC',
        data: this.horizontalLineData(v.Poc),
        borderColor: 'rgba(0,200,0,0.9)',
        borderWidth: 1,
        pointRadius: 0,
      });
      overlays.push({
        type: 'line' as const,
        label: 'VAH',
        data: this.horizontalLineData(v.Vah),
        borderColor: 'rgba(200,0,200,0.9)',
        borderWidth: 1,
        pointRadius: 0,
      });
      overlays.push({
        type: 'line' as const,
        label: 'VAL',
        data: this.horizontalLineData(v.Val),
        borderColor: 'rgba(200,200,0,0.9)',
        borderWidth: 1,
        pointRadius: 0,
      });
    });
    (this.chartData.datasets as unknown as unknown[]).push(
      ...(overlays as unknown[]),
    );
    // reassign chartData to trigger ng2-charts change detection
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
  }

  // Rebuild overlays based on current flags and cached level arrays. Removes old overlays, adds enabled overlays and resets zoom.
  private refreshOverlays(): void {
    // remove all overlays
    this.chartData.datasets = this.chartData.datasets.slice(0, this.mainDatasetCount);
    // add overlays based on flags
    if (this.showFib && this.fibLevels.length) this.addFibDatasets();
    if ((this.showEmaMma || this.showVwap) && this.emaMmaLevels.length) this.addEmaMmaDatasets();
    if (this.showVolumeProfile && this.volumeProfiles.length) this.addVolumeProfileDatasets();
    // ensure change detection and reset zoom so x-range fits candlesticks
    this.chartData = { datasets: [...(this.chartData.datasets as unknown as unknown[])] };
    this.resetZoom();
  }

  private removeFibDatasets(): void {
  this.chartData.datasets = this.chartData.datasets.slice(0, this.mainDatasetCount);
  // reassign to trigger update and reset zoom to fit main data
  this.chartData = { datasets: [...(this.chartData.datasets as unknown as unknown[])] };
  this.resetZoom();
  }

  private removeEmaMmaDatasets(): void {
  this.chartData.datasets = this.chartData.datasets.slice(0, this.mainDatasetCount);
  // reassign to trigger update and reset zoom to fit main data
  this.chartData = { datasets: [...(this.chartData.datasets as unknown as unknown[])] };
  this.resetZoom();
  }

  private removeVolumeProfileDatasets(): void {
  this.chartData.datasets = this.chartData.datasets.slice(0, this.mainDatasetCount);
  // reassign to trigger update and reset zoom to fit main data
  this.chartData = { datasets: [...(this.chartData.datasets as unknown as unknown[])] };
  this.resetZoom();
  }

  // Helper to create a dataset that draws a horizontal line across current x-range
  private horizontalLineData(price: number): Array<{ x: number; y: number }> {
    // Use Array<T> instead of T[] for complex types per lint rules
    // If we have candle data, use its x-range, otherwise create two points
    const candleDs = this.chartData.datasets[0]?.data as unknown as
      | Array<{ x: number } | undefined>
      | undefined;
    if (candleDs && candleDs.length >= 2) {
      const x0 = (candleDs[0] as { x: number }).x;
      const x1 = (candleDs[candleDs.length - 1] as { x: number }).x;
      return Array.of<{ x: number; y: number }>(
        { x: x0, y: price },
        { x: x1, y: price },
      );
    }
    return Array.of<{ x: number; y: number }>(
      { x: new Date().getTime() - 3600 * 1000, y: price },
      { x: new Date().getTime(), y: price },
    );
  }

  // Map API candles to Chart.js candlestick dataset structure
  private mapCandlesToChartData(candles: Candle[]): void {
    const ds = (candles || []).map((c) => ({
      x: new Date(c.Time).getTime(),
      o: c.Open,
      h: c.High,
      l: c.Low,
      c: c.Close,
    }));
    this.chartData = {
      datasets: [
        {
          label: `${this.selectedSymbol} ${this.selectedTimeframe}`,
          data: ds,
        },
      ],
    };
    // set how many datasets are main (candlestick) so overlays can be sliced off
    this.mainDatasetCount = this.chartData.datasets.length;
  }
}

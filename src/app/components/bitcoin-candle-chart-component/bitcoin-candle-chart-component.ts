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
  showBoxes = true;
  // show overlays that have zero values (when false, zero-valued overlays are omitted)
  showZeros = false;

  // cached levels
  fibLevels: FibLevel[] = [];
  emaMmaLevels: EmaMmaLevel[] = [];
  volumeProfiles: VolumeProfile[] = [];
  // boxes for selected symbol/timeframe
  boxes: any[] = [];

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

  // simple in-memory caches to avoid repeated HTTP calls per symbol/timeframe
  private boxesCache = new Map<string, any[]>();
  private fibCache = new Map<string, FibLevel[]>();
  private emaCache = new Map<string, EmaMmaLevel[]>();
  private volumeProfileCache = new Map<string, VolumeProfile[]>();
  private candlesCache = new Map<string, Candle[]>();

  // how many datasets are main (candlestick) so we can slice overlays off
  private mainDatasetCount = 1;
  private annotationRegistered = false;
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
    // register a fallback plugin that draws boxes directly on the canvas
    Chart.register({
      id: 'drawBoxesFallback',
      afterDraw: (chart: any) => {
        if (!this.showBoxes || !this.boxes || !this.boxes.length) return;
        const ctx = chart.ctx;
        const yScale = chart.scales['y'];
        const xScale = chart.scales['x'];
        // draw boxes across full x-range between ZoneMin/ZoneMax
        this.boxes.forEach((b: any) => {
          try {
            const y1 = yScale.getPixelForValue(b.ZoneMax);
            const y2 = yScale.getPixelForValue(b.ZoneMin);
            const left = xScale.left;
            const right = xScale.right;
            const height = y2 - y1;
            ctx.save();
            // prepare fillStyle from Color (hex) or use rgba string
            let fill = b.Color || '#FFA500';
            if (!fill.startsWith('rgba')) {
              const hex = fill.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const bl = parseInt(hex.substring(4, 6), 16);
              fill = `rgba(${r},${g},${bl},0.12)`;
            }
            ctx.fillStyle = fill;
            ctx.fillRect(left, y1, right - left, height);
            // draw border
            ctx.strokeStyle = b.Color || '#FFA500';
            ctx.lineWidth = 1;
            ctx.strokeRect(left, y1, right - left, height);

            // draw label: Strength and truncated Reason
            try {
              const reason = (b.Reason || '').toString();
              const strength = b.Strength != null ? `S:${b.Strength}` : '';
              const text = `${strength} ${reason}`.trim();
              const maxChars = 80;
              const disp =
                text.length > maxChars
                  ? text.substring(0, maxChars - 1) + '…'
                  : text;
              // choose contrasting color for text
              const color = b.Color || '#FFA500';
              let r = 255,
                g = 165,
                bl = 0;
              if (color.startsWith('#') && color.length === 7) {
                const hex = color.replace('#', '');
                r = parseInt(hex.substring(0, 2), 16);
                g = parseInt(hex.substring(2, 4), 16);
                bl = parseInt(hex.substring(4, 6), 16);
              }
              // luminance formula
              const lum = (0.299 * r + 0.587 * g + 0.114 * bl) / 255;
              const textColor = lum > 0.6 ? '#000000' : '#ffffff';
              ctx.save();
              ctx.font = '12px sans-serif';
              ctx.fillStyle = textColor;
              ctx.textBaseline = 'top';
              // padding inside box
              const pad = 6;
              const tx = left + pad;
              const ty = y1 + pad;
              // clip text to box width
              const maxWidth = right - left - pad * 2;
              ctx.fillText(disp, tx, ty, maxWidth);
              ctx.restore();
            } catch {
              // ignore text drawing errors
            }
            ctx.restore();
          } catch {
            // ignore drawing errors
          }
        });
      },
    });
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
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}|${limit}`;
    const cached = this.candlesCache.get(key);
    if (cached) {
      this.mapCandlesToChartData(cached || []);
      // only ensure overlays (they may be cached already)
      this.ensureOverlaysLoaded();
      return;
    }
    this.market
      .getCandles(this.selectedSymbol, this.selectedTimeframe, limit)
      .subscribe((c) => {
        this.candlesCache.set(key, c || []);
        this.mapCandlesToChartData(c || []);
        // after candles load, ensure overlays that are enabled are loaded
        this.ensureOverlaysLoaded();
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
    if (checked) this.loadFibLevels();
    else this.refreshOverlays();
  }

  toggleEmaMma(checked: boolean): void {
    this.showEmaMma = checked;
    if (checked) this.loadEmaMmaLevels();
    else this.refreshOverlays();
  }

  toggleVolumeProfile(checked: boolean): void {
    this.showVolumeProfile = checked;
    if (checked) this.loadVolumeProfiles();
    else this.refreshOverlays();
  }

  toggleVwap(checked: boolean): void {
    this.showVwap = checked;
    // VWAP data is included in the emaMma endpoint; ensure it's loaded
    if (checked) this.loadEmaMmaLevels();
    else this.refreshOverlays();
  }

  toggleBoxes(checked: boolean): void {
    this.showBoxes = checked;
    if (checked) this.loadBoxes();
    else this.refreshOverlays();
  }

  toggleShowZeros(checked: boolean): void {
    this.showZeros = checked;
    // rebuild overlays to apply zero-value filtering
    this.refreshOverlays();
  }

  private loadFibLevels(): void {
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}`;
    const cached = this.fibCache.get(key);
    if (cached) {
      this.fibLevels = cached;
      this.refreshOverlays();
      return;
    }
    this.market
      .getFibLevels(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.fibLevels = arr || [];
        this.fibCache.set(key, this.fibLevels);
        this.refreshOverlays();
      });
  }

  private loadEmaMmaLevels(): void {
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}`;
    const cached = this.emaCache.get(key);
    if (cached) {
      this.emaMmaLevels = cached;
      this.refreshOverlays();
      return;
    }
    this.market
      .getEmaMmaLevels(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.emaMmaLevels = arr || [];
        this.emaCache.set(key, this.emaMmaLevels);
        this.refreshOverlays();
      });
  }

  private loadVolumeProfiles(): void {
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}`;
    const cached = this.volumeProfileCache.get(key);
    if (cached) {
      this.volumeProfiles = cached;
      this.refreshOverlays();
      return;
    }
    this.market
      .getVolumeProfiles(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.volumeProfiles = arr || [];
        // debug: show how many profiles arrived
        console.debug('loadVolumeProfiles: got', this.volumeProfiles?.length);
        this.volumeProfileCache.set(key, this.volumeProfiles);
        this.refreshOverlays();
      });
  }

  private loadBoxes(): void {
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}`;
    const cached = this.boxesCache.get(key);
    if (cached) {
      this.boxes = cached;
      this.refreshOverlays();
      return;
    }
    this.market
      .getBoxes(this.selectedSymbol, this.selectedTimeframe)
      .subscribe((arr) => {
        this.boxes = arr || [];
        this.boxesCache.set(key, this.boxes);
        this.refreshOverlays();
      });
  }

  // Ensure overlay data is loaded for active flags (called after candles load)
  private ensureOverlaysLoaded(): void {
    // load only the datasets we need and that aren't cached yet
    if (this.showFib) this.loadFibLevels();
    if (this.showEmaMma || this.showVwap) this.loadEmaMmaLevels();
    if (this.showVolumeProfile) this.loadVolumeProfiles();
    if (this.showBoxes) this.loadBoxes();
    // after load calls settle, they will call refreshOverlays() via their subscriptions
    // but if none of them needed loading (cached), refresh overlays now
    const key = `${this.selectedSymbol}|${this.selectedTimeframe}`;
    const needFib = this.showFib && !this.fibCache.get(key);
    const needEma =
      (this.showEmaMma || this.showVwap) && !this.emaCache.get(key);
    const needVol = this.showVolumeProfile && !this.volumeProfileCache.get(key);
    const needBoxes = this.showBoxes && !this.boxesCache.get(key);
    if (!needFib && !needEma && !needVol && !needBoxes) {
      // all data available from cache, just refresh overlays
      this.refreshOverlays();
    }
  }

  private addFibDatasets(): void {
  const items = this.fibLevels || [];
  const filtered = this.showZeros ? items : items.filter((f) => Number(f.Price) !== 0);
  const overlays = filtered.map((f) => ({
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
      emaItems = this.emaMmaLevels.filter((e) =>
        vwapTypes.includes((e.Type || '').toUpperCase()),
      );
    } else if (this.showEmaMma) {
      emaItems = this.emaMmaLevels.filter(
        (e) => !vwapTypes.includes((e.Type || '').toUpperCase()),
      );
    } else {
      emaItems = [];
    }
  const items = emaItems || [];
  const filtered = this.showZeros ? items : items.filter((e) => Number(e.Value) !== 0);
  const overlays = filtered.map((e) => ({
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
    const items = this.volumeProfiles || [];
    const filtered = this.showZeros
      ? items
      : items.filter((v) => Number(v.Poc) !== 0 || Number(v.Vah) !== 0 || Number(v.Val) !== 0);
    filtered.forEach((v) => {
      if (this.showZeros || Number(v.Poc) !== 0) {
        overlays.push({
          type: 'line' as const,
          label: 'POC',
          data: this.horizontalLineData(v.Poc),
          borderColor: 'rgba(0,200,0,0.9)',
          borderWidth: 1,
          pointRadius: 0,
        });
      }
      if (this.showZeros || Number(v.Vah) !== 0) {
        overlays.push({
          type: 'line' as const,
          label: 'VAH',
          data: this.horizontalLineData(v.Vah),
          borderColor: 'rgba(200,0,200,0.9)',
          borderWidth: 1,
          pointRadius: 0,
        });
      }
      if (this.showZeros || Number(v.Val) !== 0) {
        overlays.push({
          type: 'line' as const,
          label: 'VAL',
          data: this.horizontalLineData(v.Val),
          borderColor: 'rgba(200,200,0,0.9)',
          borderWidth: 1,
          pointRadius: 0,
        });
      }
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
    this.chartData.datasets = this.chartData.datasets.slice(
      0,
      this.mainDatasetCount,
    );
    // if boxes are enabled but not loaded, fetch them
    if (this.showBoxes && !this.boxes.length) {
      this.loadBoxes();
    }
    // add overlays based on flags
    if (this.showFib && this.fibLevels.length) this.addFibDatasets();
    if ((this.showEmaMma || this.showVwap) && this.emaMmaLevels.length)
      this.addEmaMmaDatasets();
    if (this.showVolumeProfile && this.volumeProfiles.length)
      this.addVolumeProfileDatasets();
    // ensure change detection
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
    // if annotation plugin available, build annotation entries for boxes
    if (this.annotationRegistered && this.showBoxes && this.boxes.length) {
      // configure plugin options via chartOptions.plugins.annotation
      const annCfg: any = { annotations: {} };
      this.boxes.forEach((b: any, idx: number) => {
        annCfg.annotations[`box_${b.Id || idx}`] = {
          type: 'box',
          yMin: b.ZoneMin,
          yMax: b.ZoneMax,
          xMin: 'min',
          xMax: 'max',
          backgroundColor: (b.Color || '#FFA500') + '33',
          borderColor: b.Color || '#FFA500',
          borderWidth: 1,
        };
      });
      // assign annotation config to chartOptions and update chart
      this.chartOptions.plugins = this.chartOptions.plugins || {};
      this.chartOptions.plugins.annotation = annCfg;
    }
    // reset zoom so x-range fits candlesticks
    this.resetZoom();
  }

  private removeFibDatasets(): void {
    this.chartData.datasets = this.chartData.datasets.slice(
      0,
      this.mainDatasetCount,
    );
    // reassign to trigger update and reset zoom to fit main data
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
    this.resetZoom();
  }

  private removeEmaMmaDatasets(): void {
    this.chartData.datasets = this.chartData.datasets.slice(
      0,
      this.mainDatasetCount,
    );
    // reassign to trigger update and reset zoom to fit main data
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
    this.resetZoom();
  }

  private removeVolumeProfileDatasets(): void {
    this.chartData.datasets = this.chartData.datasets.slice(
      0,
      this.mainDatasetCount,
    );
    // reassign to trigger update and reset zoom to fit main data
    this.chartData = {
      datasets: [...(this.chartData.datasets as unknown as unknown[])],
    };
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

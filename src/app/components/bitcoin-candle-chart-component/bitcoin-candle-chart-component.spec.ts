import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BitcoinCandleChartComponent } from './bitcoin-candle-chart-component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MarketService, SymbolModel, Candle } from '../../modules/shared/http/market.service';

describe('BitcoinCandleChartComponent', () => {
  let component: BitcoinCandleChartComponent;
  let fixture: ComponentFixture<BitcoinCandleChartComponent>;

  beforeEach(async () => {
    const marketStub: Partial<MarketService> = {
      getSymbols: (): import('rxjs').Observable<SymbolModel[]> => of([] as SymbolModel[]),
      getCandles: (): import('rxjs').Observable<Candle[]> => of([] as Candle[]),
    };

    await TestBed.configureTestingModule({
      imports: [BitcoinCandleChartComponent, HttpClientTestingModule],
      providers: [{ provide: MarketService, useValue: marketStub }]
    }).compileComponents();

    fixture = TestBed.createComponent(BitcoinCandleChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

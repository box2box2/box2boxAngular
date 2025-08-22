import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BitcoinCandleChartComponent } from './bitcoin-candle-chart-component';

describe('BitcoinCandleChartComponent', () => {
  let component: BitcoinCandleChartComponent;
  let fixture: ComponentFixture<BitcoinCandleChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BitcoinCandleChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BitcoinCandleChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

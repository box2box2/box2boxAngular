import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BitcoinChartComponent } from './bitcoin-chart-component';

describe('BitcoinChartComponent', () => {
  let component: BitcoinChartComponent;
  let fixture: ComponentFixture<BitcoinChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BitcoinChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BitcoinChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

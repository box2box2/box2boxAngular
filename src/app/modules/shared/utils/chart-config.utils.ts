import { ChartConfiguration } from "chart.js";

export function horizontalLineData(price: number, xRange: number[]): Array<{x: number, y: number}> {
  return [
    { x: xRange[0], y: price },
    { x: xRange[1], y: price }
  ];
}

export const defaultChartOptions: ChartConfiguration['options'] = {
  responsive: true,
  plugins: {
    legend: { display: true },
  },
  scales: {
    x: { type: 'time', time: { unit: 'day', tooltipFormat: 'MMM dd' } },
    y: { beginAtZero: false }
  }
};

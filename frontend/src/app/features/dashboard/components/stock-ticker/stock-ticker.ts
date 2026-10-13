import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SparklineChart } from '../sparkline/sparkline';
import { StockTickerData } from '../../interfaces/stock-ticker.interface';

@Component({
  imports: [CommonModule, SparklineChart],
  selector: 'app-stock-ticker',
  styleUrl: './stock-ticker.css',
  templateUrl: './stock-ticker.html',
})
export class StockTicker {
  stocks = input<StockTickerData[]>([]);
  
  private readonly DUPLICATE_COUNT = 5;
  
  displayStocks = computed(() => {
    const original = this.stocks();
    if (original.length === 0) return [];
    
    const duplicated: (StockTickerData & { _index: number })[] = [];
    for (let i = 0; i < this.DUPLICATE_COUNT; i++) {
      original.forEach(stock => {
        duplicated.push({ ...stock, _index: i });
      });
    }
    return duplicated;
  });

  getOpenToCurrentPercent(stock: StockTickerData): number {
    const prices = stock.priceHistory ?? [];
    if (prices.length >= 2 && prices[0] !== 0) {
      const open = prices[0];
      const current = prices[prices.length - 1];
      return ((current - open) / open) * 100;
    }

    return stock.percentChange;
  }

  isPositiveFromOpen(stock: StockTickerData): boolean {
    return this.getOpenToCurrentPercent(stock) >= 0;
  }
}

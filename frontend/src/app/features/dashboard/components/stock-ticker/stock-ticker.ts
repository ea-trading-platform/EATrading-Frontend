<<<<<<< HEAD
import { Component } from '@angular/core';

@Component({
  imports: [],
=======
import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SparklineChart } from '../sparkline/sparkline';
import { StockTickerData } from '../../interfaces/stock-ticker.interface';

@Component({
  imports: [CommonModule, SparklineChart],
>>>>>>> feat/stock-ticker
  selector: 'app-stock-ticker',
  styleUrl: './stock-ticker.css',
  templateUrl: './stock-ticker.html',
})
<<<<<<< HEAD
export class StockTicker {}
=======
export class StockTicker {
  stocks = input<StockTickerData[]>([]);
  
  private readonly DUPLICATE_COUNT = 5;
  
  // Computed signal that duplicates stocks array N times for infinite scroll effect
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
}
>>>>>>> feat/stock-ticker

import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockCardComponent } from '../stock-card/stock-card';
import { WatchlistService } from '../../services/watchlist.service';
import { StockSearch } from '../../client-dashboard/components/stock-search/stock-search';

@Component({
    selector: 'app-watchlist',
    standalone: true,
    imports: [CommonModule, StockCardComponent, StockSearch],
    templateUrl: './watchlist.html',
    styleUrls: ['./watchlist.css'],
})
export class WatchlistComponent {
    @ViewChild(StockSearch) stockSearch!: StockSearch;

    constructor(protected watchlistService: WatchlistService) {}

    openAddStock(): void {
        if (this.stockSearch) {
            this.stockSearch.open();
        }
    }

    removeStock(symbol: string): void {
        this.watchlistService.removeStock(symbol);
    }
}


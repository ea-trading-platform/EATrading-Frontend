import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WatchlistService } from '../../../../core/services/watchlist.service';
import { StockCardComponent } from '../stock-card/stock-card';
import { StockSearch } from '../../client-dashboard/components/stock-search/stock-search';

@Component({
    selector: 'app-watchlist',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './watchlist.html',
    styleUrls: ['./watchlist.css'],
})
export class WatchlistComponent {
    protected readonly watchlistService = inject(WatchlistService);
    readonly symbolSelected = output<string>();

    protected readonly watchlist = this.watchlistService.watchlist;
    protected readonly isLoading = this.watchlistService.isLoading;
    protected readonly error = this.watchlistService.error;

    removeFromWatchlist(symbol: string): void {
        this.watchlistService.remove(symbol);
    }

    selectSymbol(symbol: string): void {
        this.symbolSelected.emit(symbol);
    }
}

import { Component, HostListener, computed, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface MockStock {
    symbol: string;
    name: string;
    price: number;
    history: number[];
}

const MOCK_STOCKS: MockStock[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 189.32, history: [172, 178, 175, 182, 188, 185, 189.32] },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.21, history: [162, 165, 170, 168, 174, 176, 178.21] },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 164.75, history: [150, 154, 158, 155, 160, 163, 164.75] },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.6, history: [390, 398, 402, 405, 410, 408, 415.6] },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 121.4, history: [98, 105, 110, 115, 118, 119, 121.4] },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 238.9, history: [255, 248, 240, 245, 236, 233, 238.9] },
];

@Component({
    selector: 'app-stock-search',
    standalone: true,
    imports: [DecimalPipe, FormsModule],
    templateUrl: './stock-search.html',
    styleUrl: './stock-search.css',
})
export class StockSearch {
    protected readonly isOpen = signal(false);
    protected readonly query = signal('');
    protected readonly selected = signal<MockStock | null>(null);
    protected readonly actionMessage = signal<string | null>(null);

    protected readonly filteredStocks = computed(() => {
        const term = this.query().trim().toLowerCase();
        const stocks = [...MOCK_STOCKS].sort((a, b) => a.symbol.localeCompare(b.symbol));
        if (!term) {
            return stocks;
        }
        return stocks.filter(
            (stock) => stock.symbol.toLowerCase().includes(term) || stock.name.toLowerCase().includes(term),
        );
    });

    open(): void {
        this.isOpen.set(true);
        this.query.set('');
        this.selected.set(null);
        this.actionMessage.set(null);
    }

    close(): void {
        this.isOpen.set(false);
    }

    selectStock(stock: MockStock): void {
        this.selected.set(stock);
        this.actionMessage.set(null);
    }

    backToResults(): void {
        this.selected.set(null);
    }

    placeOrder(side: 'buy' | 'sell'): void {
        const stock = this.selected();
        if (!stock) {
            return;
        }
        this.actionMessage.set(`${side === 'buy' ? 'Buy' : 'Sell'} order for ${stock.symbol} coming soon.`);
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.isOpen()) {
            this.close();
        }
    }
}

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { SparklineChart } from '../sparkline/sparkline';

export interface StockCardData {
    symbol: string;
    name?: string;
    price?: number;
    changePercent?: number;
    sparklineData?: number[];
    history?: number[];
}

@Component({
    selector: 'app-stock-card',
    standalone: true,
    imports: [CommonModule, DecimalPipe, SparklineChart],
    templateUrl: './stock-card.html',
    styleUrls: ['./stock-card.css'],
})
export class StockCardComponent {
    @Input() stock!: StockCardData;
    @Input() showRemoveButton = false;
    
    @Output() remove = new EventEmitter<string>();
    @Output() addToWatchlist = new EventEmitter<StockCardData>();
    @Output() select = new EventEmitter<StockCardData>();

    onRemove(): void {
        this.remove.emit(this.stock.symbol);
    }

    onAddToWatchlist(): void {
        this.addToWatchlist.emit(this.stock);
    }

    onSelect(): void {
        this.select.emit(this.stock);
    }

    private getSeries(stock: StockCardData): number[] {
        return stock.sparklineData || stock.history || [];
    }

    getOpenToCurrentPercent(stock: StockCardData): number | undefined {
        const values = this.getSeries(stock);
        if (values.length >= 2 && values[0] !== 0) {
            const open = values[0];
            const current = values[values.length - 1];
            return ((current - open) / open) * 100;
        }

        return stock.changePercent;
    }

    getChangeColor(stock: StockCardData): string {
        const changePercent = this.getOpenToCurrentPercent(stock);
        if (changePercent === undefined || changePercent === 0) return '#888888';
        return changePercent > 0 ? '#22c55e' : '#ef4444';
    }

    getChangeDisplay(stock: StockCardData): string {
        const changePercent = this.getOpenToCurrentPercent(stock);
        if (changePercent === undefined) return '';
        const sign = changePercent >= 0 ? '+' : '';
        return `${sign}${changePercent.toFixed(2)}%`;
    }
}

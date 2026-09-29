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

    getChangeColor(changePercent?: number): string {
        if (changePercent === undefined || changePercent === 0) return '#888888';
        return changePercent > 0 ? '#22c55e' : '#ef4444';
    }

    getChangeDisplay(changePercent?: number): string {
        if (changePercent === undefined) return '';
        const sign = changePercent >= 0 ? '+' : '';
        return `${sign}${changePercent.toFixed(2)}%`;
    }
}

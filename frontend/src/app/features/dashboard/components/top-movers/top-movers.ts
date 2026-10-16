import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { StockCardComponent } from '../stock-card/stock-card';

export interface TopMover {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    sparklineData: number[];
}

@Component({
    selector: 'app-top-movers',
    standalone: true,
    imports: [StockCardComponent],
    templateUrl: './top-movers.html',
    styleUrls: ['./top-movers.css'],
})
export class TopMoversComponent implements OnInit, OnDestroy {
    // Mock data - gainers
    private gainers: TopMover[] = [
        {
            symbol: 'NVDA',
            name: 'NVIDIA Corporation',
            price: 875.50,
            changePercent: 12.5,
            sparklineData: [100, 102, 104, 103, 105, 108, 107, 110, 112, 115],
        },
        {
            symbol: 'TSLA',
            name: 'Tesla Inc.',
            price: 245.75,
            changePercent: 8.3,
            sparklineData: [100, 101, 103, 102, 104, 106, 105, 107, 108, 108],
        },
        {
            symbol: 'MAGNIFICENT7',
            name: 'Mag 7 Index',
            price: 1234.20,
            changePercent: 7.9,
            sparklineData: [100, 101, 102, 103, 104, 105, 106, 107, 107, 108],
        },
        {
            symbol: 'META',
            name: 'Meta Platforms',
            price: 412.15,
            changePercent: 6.2,
            sparklineData: [100, 102, 103, 102, 104, 105, 104, 106, 105, 106],
        },
        {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            price: 228.90,
            changePercent: 4.8,
            sparklineData: [100, 101, 102, 101, 102, 103, 102, 103, 104, 105],
        },
    ];

    // Mock data - losers
    private losers: TopMover[] = [
        {
            symbol: 'F',
            name: 'Ford Motor',
            price: 8.50,
            changePercent: -5.2,
            sparklineData: [100, 99, 98, 97, 96, 95, 94, 95, 94, 95],
        },
        {
            symbol: 'GM',
            name: 'General Motors',
            price: 42.75,
            changePercent: -4.1,
            sparklineData: [100, 98, 97, 96, 95, 94, 95, 96, 95, 96],
        },
        {
            symbol: 'TM',
            name: 'Toyota Motor',
            price: 142.30,
            changePercent: -3.7,
            sparklineData: [100, 99, 98, 97, 98, 97, 96, 97, 96, 97],
        },
        {
            symbol: 'HF',
            name: 'Hyundai Motor',
            price: 165.45,
            changePercent: -2.9,
            sparklineData: [100, 99, 98, 99, 98, 97, 98, 97, 98, 97],
        },
        {
            symbol: 'GE',
            name: 'General Electric',
            price: 172.20,
            changePercent: -2.3,
            sparklineData: [100, 99, 99, 98, 99, 98, 99, 98, 99, 97],
        },
    ];

    // Movers state
    movers = signal<TopMover[]>(this.gainers);
    isShowingGainers = signal(true);
    private moverInterval: any;

    constructor() {}

    ngOnInit(): void {
        this.startMoverAnimation();
    }

    ngOnDestroy(): void {
        if (this.moverInterval) {
            clearInterval(this.moverInterval);
        }
    }

    // Movers methods
    private startMoverAnimation(): void {
        this.moverInterval = setInterval(() => {
            if (this.isShowingGainers()) {
                this.movers.set(this.losers);
                this.isShowingGainers.set(false);
            } else {
                this.movers.set(this.gainers);
                this.isShowingGainers.set(true);
            }
        }, 5000);
    }

    getMoverColor(changePercent: number): string {
        return changePercent >= 0 ? '#22c55e' : '#ef4444';
    }

    getChangeDisplay(changePercent: number): string {
        const sign = changePercent >= 0 ? '+' : '';
        return `${sign}${changePercent.toFixed(2)}%`;
    }

}

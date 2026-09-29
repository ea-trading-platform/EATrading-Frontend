import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SparklineChart } from '../sparkline/sparkline';
import { StockCardComponent } from '../stock-card/stock-card';

export interface TopMover {
    symbol: string;
    name: string;
    price: number;
    changePercent: number;
    sparklineData: number[];
}

export interface NewsArticle {
    id: string;
    title: string;
    description: string;
    image_url: string | null;
    url: string;
    source: string;
    published_at: string;
    updated_at?: string;
}

type TabType = 'movers' | 'news';

@Component({
    selector: 'app-top-movers',
    standalone: true,
    imports: [CommonModule, SparklineChart, StockCardComponent],
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

    // Mock news data
    private mockNews: NewsArticle[] = [
        {
            id: '1',
            title: 'Market Rally Continues Amid Strong Economic Data',
            description: 'Stock markets surge as positive economic indicators fuel investor confidence. The S&P 500 reaches new highs.',
            image_url: null,
            url: '#',
            source: 'MarketNews',
            published_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: '2',
            title: 'Tech Sector Leads Gainers Today',
            description: 'Technology stocks outperform as earnings season progresses. Major chip manufacturers report strong quarterly results.',
            image_url: null,
            url: '#',
            source: 'FinanceToday',
            published_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
            id: '3',
            title: 'Federal Reserve Holds Interest Rates Steady',
            description: 'Central bank maintains current monetary policy amid stable inflation. Markets respond positively to the decision.',
            image_url: null,
            url: '#',
            source: 'EconomicUpdate',
            published_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
    ];

    // Tab state
    activeTab = signal<TabType>('movers');

    // Movers state
    movers = signal<TopMover[]>(this.gainers);
    isShowingGainers = signal(true);
    private moverInterval: any;

    // News state
    newsArticles = signal<NewsArticle[]>([]);
    newsLoading = signal<boolean>(false);
    newsError = signal<string | null>(null);

    constructor() {}

    ngOnInit(): void {
        this.startMoverAnimation();
        this.loadNews();
    }

    ngOnDestroy(): void {
        if (this.moverInterval) {
            clearInterval(this.moverInterval);
        }
    }

    setTab(tab: TabType): void {
        this.activeTab.set(tab);
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

    // News methods
    private loadNews(): void {
        this.newsLoading.set(true);
        this.newsError.set(null);

        // Simulate slight delay for loading state
        setTimeout(() => {
            this.newsArticles.set(this.mockNews);
            this.newsLoading.set(false);
        }, 300);
    }

    refreshNews(): void {
        this.loadNews();
    }

    getNewsDate(publishedAt: string): string {
        const date = new Date(publishedAt);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}


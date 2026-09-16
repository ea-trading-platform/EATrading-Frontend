import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SparklineChart } from '../sparkline/sparkline';
import { NewsService, NewsArticle } from '../../../../core/services/news.service';
import { Subject, takeUntil } from 'rxjs';

export interface TopMover {
    symbol: string;
    changePercent: number;
    sparklineData: number[];
}

type TabType = 'movers' | 'news';

@Component({
    selector: 'app-top-movers',
    standalone: true,
    imports: [CommonModule, SparklineChart],
    templateUrl: './top-movers.html',
    styleUrls: ['./top-movers.css'],
})
export class TopMoversComponent implements OnInit, OnDestroy {
    private newsService = inject(NewsService);
    private destroy$ = new Subject<void>();

    // Mock data - gainers
    private gainers: TopMover[] = [
        {
            symbol: 'NVDA',
            changePercent: 12.5,
            sparklineData: [100, 102, 104, 103, 105, 108, 107, 110, 112, 115],
        },
        {
            symbol: 'TSLA',
            changePercent: 8.3,
            sparklineData: [100, 101, 103, 102, 104, 106, 105, 107, 108, 108],
        },
        {
            symbol: 'MAGNIFICENT7',
            changePercent: 7.9,
            sparklineData: [100, 101, 102, 103, 104, 105, 106, 107, 107, 108],
        },
        {
            symbol: 'META',
            changePercent: 6.2,
            sparklineData: [100, 102, 103, 102, 104, 105, 104, 106, 105, 106],
        },
        {
            symbol: 'AAPL',
            changePercent: 4.8,
            sparklineData: [100, 101, 102, 101, 102, 103, 102, 103, 104, 105],
        },
    ];

    // Mock data - losers
    private losers: TopMover[] = [
        {
            symbol: 'F',
            changePercent: -5.2,
            sparklineData: [100, 99, 98, 97, 96, 95, 94, 95, 94, 95],
        },
        {
            symbol: 'GM',
            changePercent: -4.1,
            sparklineData: [100, 98, 97, 96, 95, 94, 95, 96, 95, 96],
        },
        {
            symbol: 'TM',
            changePercent: -3.7,
            sparklineData: [100, 99, 98, 97, 98, 97, 96, 97, 96, 97],
        },
        {
            symbol: 'HF',
            changePercent: -2.9,
            sparklineData: [100, 99, 98, 99, 98, 97, 98, 97, 98, 97],
        },
        {
            symbol: 'GE',
            changePercent: -2.3,
            sparklineData: [100, 99, 99, 98, 99, 98, 99, 98, 99, 97],
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

    readonly NEWS_LIMIT = 8;

    constructor() {}

    ngOnInit(): void {
        this.startMoverAnimation();
        this.loadNews();
    }

    ngOnDestroy(): void {
        if (this.moverInterval) {
            clearInterval(this.moverInterval);
        }
        this.destroy$.next();
        this.destroy$.complete();
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

        this.newsService
            .getMarketNews(this.NEWS_LIMIT)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (articles: NewsArticle[]) => {
                    this.newsArticles.set(articles);
                    this.newsLoading.set(false);
                },
                error: (error: any) => {
                    console.error('Failed to load news:', error);
                    this.newsError.set('Failed to load news');
                    this.newsLoading.set(false);
                },
            });
    }

    refreshNews(): void {
        this.loadNews();
    }

    getNewsDate(publishedAt: string): string {
        const date = new Date(publishedAt);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}


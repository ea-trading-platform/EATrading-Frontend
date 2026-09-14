import {
    Component,
    OnInit,
    OnDestroy,
    computed,
    inject,
    signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsService, NewsArticle } from '../../../../core/services/news.service';
import { NewsCardComponent } from '../news-card/news-card';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-news-sidebar',
    standalone: true,
    imports: [CommonModule, NewsCardComponent],
    templateUrl: './news-sidebar.html',
    styleUrls: ['./news-sidebar.css'],
})
export class NewsSidebarComponent implements OnInit, OnDestroy {
    private newsService = inject(NewsService);
    private destroy$ = new Subject<void>();

    // State
    newsArticles = signal<NewsArticle[]>([]);
    isLoading = signal<boolean>(false);
    error = signal<string | null>(null);

    // Constants
    readonly NEWS_LIMIT = 8;

    newsCount = computed(() => this.newsArticles().length);

    constructor() { }

    ngOnInit(): void {
        console.log('[NewsSidebar] Component initialized, loading news...');
        this.loadNews();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Load market news from the service
     */
    loadNews(): void {
        console.log('[NewsSidebar] Starting loadNews...');
        this.isLoading.set(true);
        this.error.set(null);

        this.newsService
            .getMarketNews(this.NEWS_LIMIT)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (articles: NewsArticle[]) => {
                    console.log('[NewsSidebar] News loaded successfully:', articles.length, 'articles', articles);
                    this.newsArticles.set(articles);
                    this.isLoading.set(false);
                },
                error: (error: any) => {
                    console.error('[NewsSidebar] Failed to load news:', error);
                    this.error.set('Failed to load news. Please try again.');
                    this.isLoading.set(false);
                },
            });
    }

    /**
     * Refresh news immediately
     */
    refreshNews(): void {
        this.loadNews();
    }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval, timer } from 'rxjs';
import { switchMap, catchError, map, startWith, shareReplay } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';

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

export interface MarketauxResponse {
    data: any[];
    status: string;
    next?: string;
}

@Injectable({
    providedIn: 'root',
})
export class NewsService {
    private readonly API_KEY = environment.marketauxApiKey;
    private readonly API_URL = 'https://api.marketaux.com/v1/news/all';
    private readonly CACHE_DURATION = 60000; // 1 minute cache

    private newsCache: { data: NewsArticle[]; timestamp: number } | null = null;

    constructor(private http: HttpClient) { }

    /**
     * Fetch market news from marketaux API
     * Returns top news articles
     */
    getMarketNews(limit: number = 10): Observable<NewsArticle[]> {
        console.log('[NewsService] Fetching market news from API...', {
            api_url: this.API_URL,
            limit: limit,
            has_api_key: !!this.API_KEY,
        });

        return this.http
            .get<MarketauxResponse>(this.API_URL, {
                params: {
                    api_token: this.API_KEY,
                    limit: limit.toString(),
                    language: 'en',
                },
            })
            .pipe(
                map((response: MarketauxResponse) => {
                    console.log('[NewsService] API Response received:', response);
                    if (response.data && Array.isArray(response.data)) {
                        const articles = response.data.slice(0, limit).map((article: any) => ({
                            id: article.id || `${article.title}-${Date.now()}`,
                            title: article.title || 'Untitled',
                            description: article.description || article.snippet || '',
                            image_url: article.image_url || null,
                            url: article.url || '#',
                            source: article.source || 'Unknown',
                            published_at: article.published_at || new Date().toISOString(),
                            updated_at: article.updated_at,
                        }));
                        console.log('[NewsService] Mapped articles:', articles.length, 'articles');
                        return articles;
                    }
                    console.warn('[NewsService] No data in response');
                    return [];
                }),
                catchError((error) => {
                    console.error('[NewsService] Error fetching market news:', error);
                    // Return mock data on error so app still works
                    return of(this.getMockNews());
                })
            );
    }

    /**
     * Fetch news for a specific stock symbol
     */
    getStockNews(symbol: string, limit: number = 5): Observable<NewsArticle[]> {
        return this.http
            .get<MarketauxResponse>(this.API_URL, {
                params: {
                    api_token: this.API_KEY,
                    search: symbol,
                    limit: limit.toString(),
                    language: 'en',
                },
            })
            .pipe(
                map((response: MarketauxResponse) => {
                    if (response.data && Array.isArray(response.data)) {
                        return response.data.slice(0, limit).map((article: any) => ({
                            id: article.id || `${article.title}-${Date.now()}`,
                            title: article.title || 'Untitled',
                            description: article.description || article.snippet || '',
                            image_url: article.image_url || null,
                            url: article.url || '#',
                            source: article.source || 'Unknown',
                            published_at: article.published_at || new Date().toISOString(),
                            updated_at: article.updated_at,
                        }));
                    }
                    return [];
                }),
                catchError((error) => {
                    console.error(`Error fetching news for ${symbol}:`, error);
                    return of([]);
                })
            );
    }

    /**
     * Get continuously refreshed news (refreshes every 2 minutes)
     */
    getRefreshingNews(limit: number = 10): Observable<NewsArticle[]> {
        return interval(120000).pipe(
            startWith(0),
            switchMap(() => this.getMarketNews(limit)),
            shareReplay(1)
        );
    }

    /**
     * Mock data for fallback/testing
     */
    private getMockNews(): NewsArticle[] {
        return [
            {
                id: '1',
                title: 'Market Rally Continues Amid Strong Economic Data',
                description: 'Stock markets surge as positive economic indicators fuel investor confidence.',
                image_url: null,
                url: '#',
                source: 'MarketNews',
                published_at: new Date().toISOString(),
            },
            {
                id: '2',
                title: 'Tech Sector Leads Gainers Today',
                description: 'Technology stocks outperform as earnings season progresses.',
                image_url: null,
                url: '#',
                source: 'FinanceToday',
                published_at: new Date().toISOString(),
            },
            {
                id: '3',
                title: 'Federal Reserve Holds Interest Rates Steady',
                description: 'Central bank maintains current monetary policy amid stable inflation.',
                image_url: null,
                url: '#',
                source: 'EconomicUpdate',
                published_at: new Date().toISOString(),
            },
        ];
    }
}

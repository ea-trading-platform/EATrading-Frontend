import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NewsArticle } from '../../../../core/services/news.service';

@Component({
    selector: 'app-news-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './news-card.html',
    styleUrls: ['./news-card.css'],
})
export class NewsCardComponent {
    @Input() article!: NewsArticle;

    /**
     * Format date to relative time (e.g., "2 hours ago")
     */
    getRelativeTime(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    /**
     * Format date to full timestamp string (e.g., "Jan 15, 2024 at 2:30 PM")
     */
    getFullTimestamp(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    }

    /**
     * Open article in new window
     */
    openArticle(): void {
        if (this.article.url && this.article.url !== '#') {
            window.open(this.article.url, '_blank', 'noopener,noreferrer');
        }
    }

    /**
     * Truncate text to a maximum length
     */
    truncateText(text: string, maxLength: number = 150): string {
        if (!text) return '';
        if (text.length > maxLength) {
            return text.substring(0, maxLength) + '...';
        }
        return text;
    }

    /**
     * Handle image load error with fallback gradient placeholder
     */
    onImageError(event: any): void {
        const img = event.target as HTMLImageElement;
        // Replace with a data URI SVG placeholder
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:%23764ba2;stop-opacity:1" /></linearGradient></defs><rect width="400" height="200" fill="url(%23grad)"/><text x="50%" y="50%" font-size="80" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="Arial">📰</text></svg>';
    }
}

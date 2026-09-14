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
        const originalSrc = img.src;

        // If CORS proxy hasn't been tried yet, try it
        if (!originalSrc.includes('corsproxy.io')) {
            img.src = `https://corsproxy.io/?${encodeURIComponent(originalSrc)}`;
            img.onerror = () => {
                // If proxy also fails, show placeholder
                img.style.display = 'none';
                const header = img.closest('.card-header') as HTMLElement;
                if (header) {
                    header.classList.add('image-error');
                }
            };
        } else {
            // Proxy failed, show placeholder
            img.style.display = 'none';
            const header = img.closest('.card-header') as HTMLElement;
            if (header) {
                header.classList.add('image-error');
            }
        }
    }
}

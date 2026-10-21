import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TopBar, TopBarNavItem } from '../components/top-bar/top-bar';
import { NewsSidebarComponent } from '../dashboard/components/news-sidebar/news-sidebar';

@Component({
    imports: [TopBar, NewsSidebarComponent],
    selector: 'app-news',
    standalone: true,
    styleUrl: './news.css',
    templateUrl: './news.html',
})
export class News {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly navItems: readonly TopBarNavItem[] = [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Transact', route: '/transact' },
        { label: 'News', route: '/news' },
    ];

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
}

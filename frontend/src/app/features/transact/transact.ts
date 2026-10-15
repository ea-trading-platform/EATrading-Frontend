import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { TopBar, TopBarNavItem } from '../components/top-bar/top-bar';

@Component({
    imports: [TopBar],
    selector: 'app-transact',
    standalone: true,
    styleUrl: './transact.css',
    templateUrl: './transact.html',
})
export class Transact {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly navItems: readonly TopBarNavItem[] = [
        { label: 'Dashboard', route: '/dashboard' },
        { label: 'Transact', route: '/transact' },
    ];

    async logout(): Promise<void> {
        await this.auth.signOut();
        this.router.navigateByUrl('/');
    }
}

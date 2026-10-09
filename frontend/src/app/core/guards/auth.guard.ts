import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Blocks access to authenticated-only routes. */
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.session()) {
        return true;
    }

    return router.parseUrl('/');
};

/** Sends already-authenticated users to dashboard or admin-dashboard based on role. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.session()) {
        const redirectPath = auth.isAdmin() ? '/admin-dashboard' : '/dashboard';
        return router.parseUrl(redirectPath);
    }

    return true;
};

/** Protects admin routes - only allows access if user is in admins table. */
export const adminGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated() || !auth.session()) {
        return router.parseUrl('/');
    }

    if (auth.isAdmin()) {
        return true;
    }

    return router.parseUrl('/dashboard');
};

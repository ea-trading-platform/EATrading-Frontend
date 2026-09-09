import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Blocks access to authenticated-only routes until a session has been resolved. */
export const authGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    while (auth.loading()) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    if (auth.session()) {
        return true;
    }

    return router.parseUrl('/');
};

/** Sends already-authenticated users to dashboard or admin-dashboard based on role. */
export const guestGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    while (auth.loading()) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    if (auth.session()) {
        const redirectPath = auth.isAdmin() ? '/admin-dashboard' : '/dashboard';
        return router.parseUrl(redirectPath);
    }

    return true;
};

/** Protects admin routes - only allows access if user is in admins table. */
export const adminGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    while (auth.loading()) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    if (auth.isAdmin()) {
        return true;
    }

    return router.parseUrl('/dashboard');
};

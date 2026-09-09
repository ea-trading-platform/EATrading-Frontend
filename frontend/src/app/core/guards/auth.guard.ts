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

    console.log('[guestGuard] ENTER - loading:', auth.loading(), 'session:', !!auth.session());

    while (auth.loading()) {
        console.log('[guestGuard] Waiting for loading to complete...');
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    console.log('[guestGuard] After loading wait - session:', auth.session()?.user?.email, 'isAdmin:', auth.isAdmin());

    if (auth.session()) {
        const redirectPath = auth.isAdmin() ? '/admin-dashboard' : '/dashboard';
        console.log('[guestGuard] Authenticated user found. Redirecting to:', redirectPath, 'isAdmin signal value:', auth.isAdmin());
        return router.parseUrl(redirectPath);
    }

    console.log('[guestGuard] No session, allowing access to landing');
    return true;
};

/** Protects admin routes - only allows access if user is in admins table. */
export const adminGuard: CanActivateFn = async () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    while (auth.loading()) {
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    console.log('[adminGuard] Checking admin access, isAdmin:', auth.isAdmin());
    if (auth.isAdmin()) {
        console.log('[adminGuard] Admin access granted');
        return true;
    }

    console.log('[adminGuard] Admin access denied, redirecting to /dashboard');
    return router.parseUrl('/dashboard');
};

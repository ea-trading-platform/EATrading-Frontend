import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

/** Protects routes according to the role resolved from the authenticated token. */
export const roleGuard: CanActivateFn = (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated() || !auth.session()) {
        return router.parseUrl('/');
    }

    const allowedRoles = route.data['roles'] as UserRole[] | undefined;
    const role = auth.user()?.role;

    if (role && (!allowedRoles || allowedRoles.includes(role))) {
        return true;
    }

    return role === 'ADMIN' ? router.parseUrl('/admin-dashboard') : router.parseUrl('/dashboard');
};

/** Sends already-authenticated users to the dashboard for their role. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isAuthenticated() && auth.session()) {
        return router.parseUrl(auth.user()?.role === 'ADMIN' ? '/admin-dashboard' : '/dashboard');
    }

    return true;
};

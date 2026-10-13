import { inject } from '@angular/core';
import {
    HttpErrorResponse,
    HttpInterceptorFn,
} from '@angular/common/http';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP Interceptor for Dual Authentication
 * 
 * Features:
 * - For market data endpoints (/api/v1/market/*): uses marketauxApiKey
 * - For other endpoints: uses JWT Bearer token from AuthService
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
    const authService = inject(AuthService);
    const apiKey = environment.marketauxApiKey;

    const isMarketEndpoint = request.url.includes('/api/v1/market');
    const isAuthEndpoint = request.url.includes('/api/v1/auth/');
    const isRefreshAttempt = request.headers.get('x-refresh-attempt') === '1';

    let updatedRequest = request;

    // Market data endpoints use API key
    if (isMarketEndpoint) {
        if (apiKey) {
            updatedRequest = request.clone({
                setHeaders: {
                    Authorization: apiKey,
                },
            });
        }
    } else {
        // Other endpoints (Spring Security) use JWT Bearer token
        const token = authService.getAccessToken();

        if (token) {
            updatedRequest = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`,
                },
            });
        }
    }

    return next(updatedRequest).pipe(
        catchError((error: HttpErrorResponse) => {
            // Try refresh once on 401 for protected non-market, non-auth requests.
            if (isMarketEndpoint || isAuthEndpoint || isRefreshAttempt || error.status !== 401) {
                return throwError(() => error);
            }

            return from(authService.refreshAccessToken()).pipe(
                switchMap((newAccessToken) => {
                    const retryRequest = request.clone({
                        setHeaders: {
                            Authorization: `Bearer ${newAccessToken}`,
                            'x-refresh-attempt': '1',
                        },
                    });
                    return next(retryRequest);
                }),
                catchError((refreshError) => {
                    void authService.signOut();
                    return throwError(() => refreshError);
                })
            );
        })
    );
};

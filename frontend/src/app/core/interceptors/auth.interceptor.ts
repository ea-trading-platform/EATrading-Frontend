import { Injectable, inject } from '@angular/core';
import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor for JWT Authentication
 * 
 * Features:
 * - Automatically adds Authorization header with Bearer token to all requests
 * - Handles 401 responses by refreshing the access token
 * - Retries failed requests with the new token
 * - Prevents multiple refresh requests with token refresh queue
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly authService = inject(AuthService);

    // Queue for handling multiple 401 responses
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // Add auth token if available
        const token = this.authService.getAccessToken();
        if (token) {
            request = this.addToken(request, token);
        }

        return next.handle(request).pipe(
            catchError((error) => {
                // Handle 401 Unauthorized responses
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    return this.handle401Error(request, next);
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * Add Authorization header with Bearer token
     */
    private addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
        return request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    /**
     * Handle 401 responses:
     * 1. Try to refresh the access token
     * 2. Retry the original request with new token
     * 3. If refresh fails, logout user
     */
    private handle401Error(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.refreshToken().pipe(
                switchMap((newToken: string) => {
                    this.isRefreshing = false;
                    this.refreshTokenSubject.next(newToken);
                    return next.handle(this.addToken(request, newToken));
                }),
                catchError((error) => {
                    this.isRefreshing = false;
                    this.authService.signOut();
                    return throwError(() => error);
                })
            );
        }

        // Queue other requests until token refresh completes
        return this.refreshTokenSubject.pipe(
            filter((token) => token != null),
            take(1),
            switchMap((token: string | null) => {
                return next.handle(this.addToken(request, token!));
            })
        );
    }

    /**
     * Refresh the access token
     */
    private refreshToken(): Observable<string> {
        return new Observable((observer) => {
            this.authService
                .refreshAccessToken()
                .then((newToken) => {
                    observer.next(newToken);
                    observer.complete();
                })
                .catch((error) => {
                    observer.error(error);
                });
        });
    }
}

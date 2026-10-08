import { Injectable, inject } from '@angular/core';
import {
    HttpEvent,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/**
 * HTTP Interceptor for Dual Authentication
 * 
 * Features:
 * - For market data endpoints (/api/v1/market/*): uses marketauxApiKey
 * - For other endpoints: uses JWT Bearer token from AuthService
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private readonly apiKey = environment.marketauxApiKey;
    private readonly authService = inject(AuthService);

    intercept(
        request: HttpRequest<unknown>,
        next: HttpHandler
    ): Observable<HttpEvent<unknown>> {
        // Market data endpoints use API key
        if (request.url.includes('/api/v1/market')) {
            if (this.apiKey) {
                request = request.clone({
                    setHeaders: {
                        Authorization: this.apiKey,
                    },
                });
            }
        } else {
            // Other endpoints (Spring Security) use JWT Bearer token
            const token = this.authService.getAccessToken();
            if (token) {
                request = request.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
        }

        return next.handle(request);
    }
}

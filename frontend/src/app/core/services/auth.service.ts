import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface UserProfile {
    name: string;
    balance: number;
}

export interface AuthUser {
    id: string;
    clientId?: string;
    email: string;
    roles?: string[];
    user_metadata?: {
        name?: string;
        balance?: number;
    };
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    clientId: string;
    expiresIn?: number;
    tokenType?: string;
}

/**
 * JWT-based Authentication Service
 * Integrates with backend auth endpoints for register/login/refresh
 * Manages token storage and user session state
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiBaseUrl;

    // Auth state signals
    readonly session = signal<{ user: AuthUser } | null>(null);
    readonly user = signal<AuthUser | null>(null);
    readonly profile = signal<UserProfile | null>(null);
    readonly isAdmin = signal(false);
    readonly loading = signal(false);

    constructor() {
        // Try to restore session from localStorage on init
        this.restoreSession();
    }

    /**
     * Register a new user
     */
    async signUp(email: string, password: string, name: string) {
        try {
            this.loading.set(true);
            const response = await this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/auth/register`, {
                name,
                email,
                password,
                confirmPassword: password, // Use password as confirmation
            }).toPromise();

            if (!response) {
                throw new Error('No response from server');
            }

            this.setSession(response);
            return { error: null };
        } catch (error: any) {
            const httpError = error as HttpErrorResponse;
            const backendFieldErrors = httpError?.error?.fieldErrors as Record<string, string> | undefined;
            const fieldErrorMessage = backendFieldErrors
                ? Object.entries(backendFieldErrors)
                    .map(([field, message]) => `${field}: ${message}`)
                    .join(', ')
                : null;

            const errorMsg =
                fieldErrorMessage ||
                httpError?.error?.error ||
                httpError?.error?.message ||
                (httpError?.status === 400
                    ? 'Registration failed. This email may already be registered.'
                    : null) ||
                error?.message ||
                'Registration failed';
            console.error('Registration error:', error);
            console.error('Error details:', error?.error);
            this.loading.set(false);
            return { error: errorMsg };
        }
    }

    /**
     * Sign in with email and password
     */
    async signIn(email: string, password: string) {
        try {
            this.loading.set(true);
            const response = await this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/auth/login`, {
                email,
                password,
            }).toPromise();

            if (!response) {
                throw new Error('No response from server');
            }

            this.setSession(response);
            return { error: null };
        } catch (error: any) {
            const errorMsg = error?.error?.error || error?.error?.message || 'Invalid email or password';
            console.error('Login error:', error);
            console.error('Error details:', error?.error);
            this.loading.set(false);
            return { error: errorMsg };
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(): Promise<string> {
        try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await this.http.post<AuthResponse>(`${this.apiUrl}/api/v1/auth/refresh`, {
                refreshToken,
            }).toPromise();

            if (!response) {
                throw new Error('No response from server');
            }

            this.storeTokens(response.accessToken, response.refreshToken);
            this.isAdmin.set(this.resolveAdminAccess(this.user(), response.accessToken));
            return response.accessToken;
        } catch (error: any) {
            // Refresh failed - logout user
            this.signOut();
            throw new Error('Session expired. Please login again.');
        }
    }

    /**
     * Sign out - clear all stored tokens and user info
     */
    async signOut() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        this.session.set(null);
        this.user.set(null);
        this.profile.set(null);
        this.isAdmin.set(false);
        this.loading.set(false);
    }

    /**
     * Get current access token
     */
    getAccessToken(): string | null {
        return localStorage.getItem('accessToken');
    }

    /**
     * Get current refresh token
     */
    getRefreshToken(): string | null {
        return localStorage.getItem('refreshToken');
    }

    /**
     * Get current user from localStorage
     */
    getCurrentUser(): AuthUser | null {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        const token = this.getAccessToken();
        return !!token && !this.isTokenExpired(token);
    }

    /**
     * Restore session from localStorage on app init
     */
    private restoreSession(): void {
        const token = this.getAccessToken();
        const userStr = localStorage.getItem('user');

        if (!token) {
            return;
        }

        if (this.isTokenExpired(token)) {
            this.signOut();
            return;
        }

        try {
            const restoredUser = userStr ? JSON.parse(userStr) as AuthUser : this.buildUserFromToken(token);
            const session: { user: AuthUser } = { user: restoredUser };
            this.session.set(session);
            this.user.set(restoredUser);
            this.profile.set(this.buildProfile(restoredUser));
            this.isAdmin.set(this.resolveAdminAccess(restoredUser, token));

            // Ensure a usable user shape exists for subsequent app usage.
            if (!userStr) {
                localStorage.setItem('user', JSON.stringify(restoredUser));
            }
        } catch (error) {
            console.error('Failed to restore session:', error);
            this.signOut();
        }
    }

    /**
     * Store tokens and set user session
     */
    private setSession(response: AuthResponse): void {
        this.storeTokens(response.accessToken, response.refreshToken);

        const tokenUser = this.buildUserFromToken(response.accessToken);
        const resolvedClientId = response.clientId || tokenUser.clientId || tokenUser.id;

        const user: AuthUser = {
            id: resolvedClientId,
            clientId: resolvedClientId,
            email: tokenUser.email,
            roles: tokenUser.roles,
            user_metadata: {
                name: tokenUser.user_metadata?.name || tokenUser.email,
            }
        };

        const session: { user: AuthUser } = { user };
        this.session.set(session);
        this.user.set(user);
        this.profile.set(this.buildProfile(user));
        this.isAdmin.set(this.resolveAdminAccess(user, response.accessToken));
        this.loading.set(false);

        // Store user in localStorage for session persistence
        localStorage.setItem('user', JSON.stringify(user));
    }

    /**
     * Store tokens in localStorage
     */
    private storeTokens(accessToken: string, refreshToken: string): void {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
    }

    /**
     * Build profile from user data
     */
    private buildProfile(user: AuthUser): UserProfile {
        return {
            name: user?.user_metadata?.name ?? user?.email ?? 'Trader',
            balance: user?.user_metadata?.balance ?? 0,
        };
    }

    /**
     * Determine admin access from user/response roles and token claims.
     */
    private resolveAdminAccess(user: AuthUser | null, token: string): boolean {
        const userRoles = user?.roles ?? [];
        const tokenRoles = this.extractRolesFromToken(token);
        const combinedRoles = [...userRoles, ...tokenRoles].map((role) => this.normalizeRoleName(role));
        return combinedRoles.includes('ADMIN');
    }

    private extractRolesFromToken(token: string): string[] {
        const payload = this.decodeJwtPayload(token);
        if (!payload) {
            return [];
        }

        const roleSources: unknown[] = [
            payload['roles'],
            payload['role'],
            payload['authorities'],
            payload['scope'],
            payload['scp'],
        ];

        const roles: string[] = [];
        for (const source of roleSources) {
            if (Array.isArray(source)) {
                for (const value of source) {
                    if (typeof value === 'string') {
                        roles.push(value);
                    }
                }
                continue;
            }

            if (typeof source === 'string') {
                roles.push(...source.split(/\s+/).filter(Boolean));
            }
        }

        return Array.from(new Set(roles));
    }

    private buildUserFromToken(token: string): AuthUser {
        const payload = this.decodeJwtPayload(token);
        const id = typeof payload?.['sub'] === 'string' ? payload['sub'] : 'unknown-user';
        const email = typeof payload?.['email'] === 'string'
            ? payload['email']
            : typeof payload?.['preferred_username'] === 'string'
                ? payload['preferred_username']
                : 'unknown@user.local';
        const roles = this.extractRolesFromToken(token);

        return {
            id,
            clientId: id,
            email,
            roles,
            user_metadata: {
                name: email,
            },
        };
    }

    private isTokenExpired(token: string): boolean {
        const payload = this.decodeJwtPayload(token);
        const exp = payload?.['exp'];
        if (typeof exp !== 'number') {
            return false;
        }
        return Date.now() >= exp * 1000;
    }

    private decodeJwtPayload(token: string): Record<string, any> | null {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }

        try {
            const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
            const json = atob(padded);
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    private normalizeRoleName(role: string): string {
        return role.replace(/^ROLE_/i, '').toUpperCase();
    }
}

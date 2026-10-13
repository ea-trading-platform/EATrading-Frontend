import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface UserProfile {
    name: string;
    balance: number;
}

export interface AuthUser {
    id: string;
    clientId?: string;
    email?: string;
    user_metadata?: {
        name?: string;
        balance?: number;
    };
}

export interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    clientId: string;
    email: string;
    name?: string;
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
    readonly loading = signal(true);

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
            const errorMsg = error?.error?.error || error?.error?.message || error?.message || 'Registration failed';
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
        if (!userStr) {
            return null;
        }

        try {
            return JSON.parse(userStr) as AuthUser;
        } catch {
            return null;
        }
    }

    /**
     * Resolve clientId from the in-memory session or persisted user.
     */
    getClientId(): string | null {
        const runtimeUser = this.user();
        if (runtimeUser?.clientId) {
            return runtimeUser.clientId;
        }
        if (runtimeUser?.id) {
            return runtimeUser.id;
        }

        const persistedUser = this.getCurrentUser();
        if (persistedUser?.clientId) {
            return persistedUser.clientId;
        }
        return persistedUser?.id ?? null;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getAccessToken();
    }

    /**
     * Restore session from localStorage on app init
     */
    private restoreSession(): void {
        const token = this.getAccessToken();
        const parsedUser = this.getCurrentUser();

        if (!token || !parsedUser) {
            this.loading.set(false);
            return;
        }

        try {
            const id = parsedUser.id ?? parsedUser.clientId ?? '';
            if (!id) {
                throw new Error('Invalid persisted user session: missing id');
            }

            const user: AuthUser = {
                id,
                clientId: parsedUser.clientId ?? id,
                email: parsedUser.email,
                user_metadata: parsedUser.user_metadata,
            };

            const session: { user: AuthUser } = { user };
            this.session.set(session);
            this.user.set(user);
            this.profile.set(this.buildProfile(user));
        } catch (error) {
            console.error('Failed to restore session:', error);
            void this.signOut();
        } finally {
            this.loading.set(false);
        }
    }

    /**
     * Store tokens and set user session
     */
    private setSession(response: AuthResponse): void {
        this.storeTokens(response.accessToken, response.refreshToken);

        const user: AuthUser = {
            id: response.clientId,
            clientId: response.clientId,
            email: response.email,
            user_metadata: {
                name: response.name || response.email,
            }
        };

        const session: { user: AuthUser } = { user };
        this.session.set(session);
        this.user.set(user);
        this.profile.set(this.buildProfile(user));
        this.isAdmin.set(true);
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
}

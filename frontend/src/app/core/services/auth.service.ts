import { Injectable, signal } from '@angular/core';

export interface UserProfile {
    name: string;
    balance: number;
}

export interface AuthUser {
    id: string;
    email: string;
    user_metadata: {
        name?: string;
        balance?: number;
    };
}

/**
 * Stubbed Auth Service (Supabase removed, using fake data)
 * Provides session and user signals for backwards compatibility.
 * TODO: Replace with real auth when backend authentication is implemented.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    // Fake user for development
    private readonly fakeUser: AuthUser = {
        id: 'fake-user-uuid-12345',
        email: 'demo@eatrading.local',
        user_metadata: {
            name: 'Demo Trader',
            balance: 50000
        }
    };

    readonly session = signal<{ user: AuthUser } | null>(null);
    readonly user = signal<AuthUser | null>(null);
    readonly profile = signal<UserProfile | null>(null);
    readonly isAdmin = signal(false);
    readonly loading = signal(false);

    constructor() {
        // Initialize with fake demo user
        setTimeout(() => {
            this.setDemoSession();
        }, 500);
    }

    private setDemoSession(): void {
        const demoSession: { user: AuthUser } = { user: this.fakeUser };
        this.session.set(demoSession);
        this.user.set(this.fakeUser);
        this.profile.set(this.buildProfile(this.fakeUser));
        this.isAdmin.set(true); // Demo user is admin
        this.loading.set(false);
    }

    async signUp(email: string, password: string, name: string) {
        // Stubbed: just return success
        return { error: null };
    }

    async signIn(email: string, password: string) {
        // Stubbed: just return success and set demo session
        this.setDemoSession();
        return { error: null };
    }

    async signOut() {
        this.session.set(null);
        this.user.set(null);
        this.profile.set(null);
        this.isAdmin.set(false);
    }

    /** Build profile from user metadata */
    private buildProfile(user: AuthUser): UserProfile {
        return {
            name: (user?.user_metadata?.name) ?? user?.email ?? 'Trader',
            balance: (user?.user_metadata?.balance) ?? 0,
        };
    }
}

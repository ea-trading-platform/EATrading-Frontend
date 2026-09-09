import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

export interface UserProfile {
    name: string;
    balance: number;
}

/**
 * Wraps the Supabase JS client for auth. Session state is tracked in signals
 * so components can react to sign-in/sign-out without manual subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

    readonly session = signal<Session | null>(null);
    readonly user = signal<User | null>(null);
    readonly profile = signal<UserProfile | null>(null);
    readonly isAdmin = signal(false);
    readonly loading = signal(true);

    constructor() {
        this.client.auth.getSession().then(({ data }) => {
            this.setSession(data.session);
            if (data.session?.user.id) {
                this.checkAdminStatus(data.session.user.id);
            }
            this.loading.set(false);
        });

        this.client.auth.onAuthStateChange((_event, session) => {
            this.setSession(session);
            if (session?.user.id) {
                this.checkAdminStatus(session.user.id);
            }
        });
    }

    async signUp(email: string, password: string, name: string) {
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: { data: { name } },
        });
        if (!error && data.session) {
            this.setSession(data.session);
        }
        return { error };
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (!error && data.session) {
            this.setSession(data.session);
            await this.checkAdminStatus(data.session.user.id);
        }
        return { error };
    }

    async signOut() {
        await this.client.auth.signOut();
        this.setSession(null);
    }

    private setSession(session: Session | null): void {
        this.session.set(session);
        this.user.set(session?.user ?? null);
        this.profile.set(session ? this.buildProfile(session.user) : null);
        this.isAdmin.set(false);
    }

    /** Check if user exists in public.admins table */
    private async checkAdminStatus(userId: string): Promise<void> {
        const { data } = await this.client
            .from('admins')
            .select('admin_id')
            .eq('admin_id', userId);

        const isAdmin = (data?.length ?? 0) > 0;
        this.isAdmin.set(isAdmin);
    }

    /** Placeholder profile derived from auth metadata until a real profiles/balance table is wired up. */
    private buildProfile(user: User): UserProfile {
        return {
            name: (user.user_metadata?.['name'] as string) ?? user.email ?? 'Trader',
            balance: (user.user_metadata?.['balance'] as number) ?? 0,
        };
    }
}

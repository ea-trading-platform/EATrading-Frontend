import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

type AuthMode = 'none' | 'login' | 'signup';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './landing.html',
    styleUrl: './landing.css',
})
export class Landing {
    private readonly auth = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly mode = signal<AuthMode>('none');
    protected readonly submitting = signal(false);
    protected readonly error = signal<string | null>(null);

    protected readonly name = signal('');
    protected readonly email = signal('');
    protected readonly password = signal('');

    openLogin(): void {
        this.error.set(null);
        this.mode.set('login');
    }

    openSignup(): void {
        this.error.set(null);
        this.mode.set('signup');
    }

    closePanel(): void {
        this.mode.set('none');
        this.error.set(null);
    }

    async submit(): Promise<void> {
        if (this.submitting()) {
            return;
        }
        this.error.set(null);
        this.submitting.set(true);

        const { error } =
            this.mode() === 'signup'
                ? await this.auth.signUp(this.email(), this.password(), this.name())
                : await this.auth.signIn(this.email(), this.password());

        this.submitting.set(false);

        if (error) {
            this.error.set(error.message);
            return;
        }

        // Dynamically redirect based on admin status
        const redirectPath = this.auth.isAdmin() ? '/admin-dashboard' : '/dashboard';
        this.router.navigateByUrl(redirectPath);
    }
}

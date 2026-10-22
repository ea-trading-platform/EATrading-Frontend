import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

export interface TopBarNavItem {
  label: string;
  route: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive, FormsModule],
  selector: 'app-top-bar',
  styleUrl: './top-bar.css',
  templateUrl: './top-bar.html',
  host: {
    '(document:click)': 'dismissProfileMenu($event)',
    '(keydown.escape)': 'closeProfileMenu()',
  },
})
export class TopBar {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly profileMenu = viewChild.required<ElementRef<HTMLElement>>('profileMenu');
  private readonly profileButton = viewChild.required<ElementRef<HTMLButtonElement>>('profileButton');
  private readonly passwordDialog = viewChild.required<ElementRef<HTMLDialogElement>>('passwordDialog');

  navItems = input<readonly TopBarNavItem[]>([]);
  dashboardRoute = input('/dashboard');
  logout = output<void>();

  protected readonly profileOpen = signal(false);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly email = signal('');
  protected readonly currentPassword = signal('');
  protected readonly newPassword = signal('');
  protected readonly confirmNewPassword = signal('');

  protected dismissProfileMenu(event: Event): void {
    if (event.target instanceof Node && !this.profileMenu().nativeElement.contains(event.target)) {
      this.profileOpen.set(false);
    }
  }

  protected closeProfileMenu(): void {
    if (this.profileOpen()) {
      this.profileOpen.set(false);
      this.profileButton().nativeElement.focus();
    }
  }

  protected openChangePassword(form: NgForm): void {
    this.closeProfileMenu();
    form.resetForm();
    this.email.set(this.auth.user()?.email ?? '');
    this.resetPasswords();
    this.passwordDialog().nativeElement.showModal();
  }

  protected closeChangePassword(): void {
    if (this.submitting()) {
      return;
    }
    this.passwordDialog().nativeElement.close();
    this.resetPasswords();
    this.profileButton().nativeElement.focus();
  }

  protected cancelChangePassword(event: Event): void {
    event.preventDefault();
    this.closeChangePassword();
  }

  protected signOut(): void {
    this.profileOpen.set(false);
    this.logout.emit();
  }

  protected async submitPassword(form: NgForm): Promise<void> {
    if (this.submitting()) {
      return;
    }
    form.control.markAllAsTouched();
    if (form.invalid || this.newPassword() !== this.confirmNewPassword() ||
        this.currentPassword() === this.newPassword()) {
      return;
    }

    this.error.set(null);
    this.submitting.set(true);
    try {
      const { error } = await this.auth.changePassword({
        email: this.email(),
        currentPassword: this.currentPassword(),
        newPassword: this.newPassword(),
        confirmNewPassword: this.confirmNewPassword(),
      });
      if (error) {
        this.error.set(error);
        return;
      }
      this.passwordDialog().nativeElement.close();
      this.resetPasswords();
      await this.router.navigateByUrl('/');
    } finally {
      this.submitting.set(false);
    }
  }

  private resetPasswords(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmNewPassword.set('');
    this.error.set(null);
  }
}

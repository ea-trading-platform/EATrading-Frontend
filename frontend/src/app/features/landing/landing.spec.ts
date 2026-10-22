import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { Landing } from './landing';

describe('Landing account actions', () => {
  it('offers login and signup without a change-password option', async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Landing);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const expectNoPasswordChange = () => {
      expect(element.querySelector('form')).toBeTruthy();
      expect(element.textContent?.toLowerCase()).not.toContain('change password');
      expect(element.querySelector('[name="currentPassword"]')).toBeNull();
      expect(element.querySelector('[name="newPassword"]')).toBeNull();
      expect(element.querySelector('[name="confirmNewPassword"]')).toBeNull();
    };

    expectNoPasswordChange();
    expect(element.querySelector('h2')!.textContent).toContain('Welcome back');
    expect(element.querySelector('[name="email"]')).toBeTruthy();
    expect(element.querySelector('[name="password"]')).toBeTruthy();
    expect(element.querySelector('[name="name"]')).toBeNull();

    element.querySelector<HTMLAnchorElement>('.switch-mode a')!.click();
    await fixture.whenStable();
    expectNoPasswordChange();
    expect(element.querySelector('h2')!.textContent).toContain('Create your account');
    expect(element.querySelector('[name="name"]')).toBeTruthy();
    expect(element.querySelector('[name="confirmPassword"]')).toBeTruthy();

    element.querySelector<HTMLAnchorElement>('.switch-mode a')!.click();
    await fixture.whenStable();
    expectNoPasswordChange();
    expect(element.querySelector('h2')!.textContent).toContain('Welcome back');
    expect(element.querySelector('[name="name"]')).toBeNull();
    expect(element.querySelector('[name="confirmPassword"]')).toBeNull();
  });

  it.each([false, true])('preserves login navigation for admin=%s', async isAdmin => {
    const signIn = vi.fn().mockResolvedValue({ error: null });
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signIn, isAdmin: () => isAdmin } },
      ],
    }).compileComponents();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Landing);
    fixture.componentInstance.openLogin();
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    for (const [name, value] of Object.entries({ email: 'trader@example.com', password: 'old-password' })) {
      const input = element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    await fixture.whenStable();
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await fixture.whenStable();
    expect(signIn).toHaveBeenCalledWith('trader@example.com', 'old-password');
    expect(navigate).toHaveBeenCalledWith(isAdmin ? '/admin-dashboard' : '/dashboard');
  });
});

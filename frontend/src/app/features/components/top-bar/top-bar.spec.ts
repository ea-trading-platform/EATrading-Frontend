import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthService } from '../../../core/services/auth.service';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let component: TopBar;
  let fixture: ComponentFixture<TopBar>;
  let element: HTMLElement;
  let dialog: HTMLDialogElement;
  const changePassword = vi.fn();

  async function click(selector: string): Promise<void> {
    element.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  }

  async function openPasswordDialog(): Promise<void> {
    await click('.profile-button');
    await click('.profile-options button');
  }

  async function fillPasswords(current: string, next: string, confirmation = next): Promise<void> {
    for (const [name, value] of Object.entries({
      currentPassword: current, newPassword: next, confirmNewPassword: confirmation,
    })) {
      const input = element.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: {
          user: signal({ email: 'trader@example.com' }),
          changePassword,
        } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TopBar);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    await fixture.whenStable();
    dialog = element.querySelector('dialog')!;
    dialog.showModal = vi.fn(() => dialog.setAttribute('open', ''));
    dialog.close = vi.fn(() => dialog.removeAttribute('open'));
    changePassword.mockReset();
    changePassword.mockResolvedValue({ error: null });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows a person icon and toggles account options', async () => {
    expect(element.querySelector('.profile-button svg')).toBeTruthy();
    expect(element.querySelector('.profile-options')).toBeNull();
    await click('.profile-button');
    expect(element.querySelector('.profile-button')!.getAttribute('aria-expanded')).toBe('true');
    expect(element.querySelector('.profile-options')!.textContent).toContain('Change password');
    expect(element.querySelector('.profile-options')!.textContent).toContain('Logout');
    await click('.profile-button');
    expect(element.querySelector('.profile-options')).toBeNull();
  });

  it('dismisses account options on outside click and Escape', async () => {
    await click('.profile-button');
    document.body.click();
    await fixture.whenStable();
    expect(element.querySelector('.profile-options')).toBeNull();
    await click('.profile-button');
    element.querySelector('.profile-button')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
    expect(element.querySelector('.profile-options')).toBeNull();
  });

  it('keeps logout wired to the existing output', async () => {
    const logout = vi.fn();
    component.logout.subscribe(logout);
    await click('.profile-button');
    await click('.profile-options button:last-child');
    expect(logout).toHaveBeenCalledOnce();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('requires the old password, a valid new password, and matching confirmation', async () => {
    await openPasswordDialog();
    await fillPasswords('', 'new-password');
    await submit();
    expect(element.textContent).toContain('Current password is required');
    await fillPasswords('old-password', 'short');
    await submit();
    await fillPasswords('old-password', 'old-password');
    await submit();
    expect(element.textContent).toContain('New password must be different');
    await fillPasswords('old-password', 'new-password', 'mismatch');
    await submit();
    expect(element.textContent).toContain('must match');
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('uses the existing password payload and returns to landing after success', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await openPasswordDialog();
    expect(dialog.open).toBe(true);
    expect(element.querySelector<HTMLInputElement>('[name="email"]')!.value).toBe('trader@example.com');
    await fillPasswords('old-password', 'new-password');
    await submit();
    expect(changePassword).toHaveBeenCalledExactlyOnceWith({
      email: 'trader@example.com',
      currentPassword: 'old-password',
      newPassword: 'new-password',
      confirmNewPassword: 'new-password',
    });
    expect(navigate).toHaveBeenCalledWith('/');
    expect(dialog.open).toBe(false);
    expect(element.querySelector<HTMLInputElement>('[name="currentPassword"]')!.value).toBe('');
  });

  it('displays API errors without closing the form or navigating', async () => {
    changePassword.mockResolvedValue({ error: 'Current password is incorrect' });
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl');
    await openPasswordDialog();
    await fillPasswords('old-password', 'new-password');
    await submit();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Current password is incorrect');
    expect(dialog.open).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('prevents duplicate submissions and cancellation while saving', async () => {
    let finish!: (result: { error: string | null }) => void;
    changePassword.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await openPasswordDialog();
    await fillPasswords('old-password', 'new-password');
    await submit();
    await submit();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(true);
    expect(changePassword).toHaveBeenCalledOnce();
    finish({ error: null });
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
  });

  it('clears passwords and errors when cancelled and reopened', async () => {
    await openPasswordDialog();
    await fillPasswords('old-password', 'new-password');
    await click('.cancel-button');
    expect(dialog.open).toBe(false);
    await openPasswordDialog();
    for (const input of element.querySelectorAll<HTMLInputElement>('input[type="password"]')) {
      expect(input.value).toBe('');
    }
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });
});

import { expect, test } from '@playwright/test';

test.describe('landing page', () => {
    test('opens the login form', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByRole('heading', { name: 'Trade smarter, together.' })).toBeVisible();
        await page.getByRole('button', { name: 'Log in' }).click();

        await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
        await expect(page.getByLabel('Email')).toBeVisible();
        await expect(page.getByLabel('Password')).toBeVisible();
    });
});

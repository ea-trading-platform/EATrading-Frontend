import { expect, test } from '@playwright/test';
import { mockTradingApi } from './fixtures';

test('signs up and opens the trading ticket with mocked API data', async ({ page }) => {
    await mockTradingApi(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.getByRole('textbox', { name: 'Name' }).fill('Test Account');
    await page.getByRole('textbox', { name: 'Email' }).fill('test@eatrading.com');
    await page.getByRole('textbox', { name: 'Password', exact: true }).fill('12345678');
    await page.getByRole('textbox', { name: 'Password confirmation' }).fill('12345678');
    await page.locator('form').getByRole('button', { name: 'Sign up' }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await page.getByRole('link', { name: 'Transact' }).click();

    await expect(page).toHaveURL(/\/transact$/);
    const suggestions = page.locator('.symbol-recommendations');
    await suggestions.getByRole('button', { name: 'TSLA' }).click();
    await expect(page.locator('#symbol')).toHaveValue('TSLA');

    await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).fill('2');
    await page.getByRole('button', { name: 'Crypto' }).click();
    await page.getByRole('button', { name: 'Forex' }).click();
    await page.getByRole('button', { name: 'Equities' }).click();
    await expect(page.getByRole('button', { name: 'Equities' })).toHaveClass(/active/);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
});

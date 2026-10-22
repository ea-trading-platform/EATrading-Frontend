import { expect, test } from '@playwright/test';
import { mockTradingApi, submittedTrackingId } from './fixtures';

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
    await page.getByRole('button', { name: 'Forex' }).click();
    await suggestions.getByRole('button', { name: 'EURUSD' }).click();
    await expect(page.locator('#symbol')).toHaveValue('EURUSD');
    await page.getByRole('spinbutton', { name: 'Quantity (shares)' }).fill('2');

    const orderRequest = page.waitForRequest((request) =>
        request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders',
    );
    await page.getByRole('button', { name: 'Submit order' }).click();

    const requestBody = (await orderRequest).postDataJSON();
    expect(requestBody).toMatchObject({
        clientId: expect.any(String),
        symbol: 'FX:EURUSD',
        quantity: '2',
        transactionType: 'BUY',
        instrument: 'CASH',
        instrumentType: 'CASH',
    });
    await expect(page.getByRole('status')).toContainText(`Tracking ID: ${submittedTrackingId}`);

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/$/);
});

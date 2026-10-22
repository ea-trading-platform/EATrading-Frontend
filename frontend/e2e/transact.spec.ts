import { expect, test } from '@playwright/test';
import { mockAuthenticatedClient, mockTradingApi, trackingId } from './fixtures';

test.describe('Transact Open Orders', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuthenticatedClient(page);
        await mockTradingApi(page);
    });

    test('loads mocked open orders and cancels a pending order', async ({ page }) => {
        const cancelRequest = page.waitForRequest((request) =>
            request.method() === 'PATCH' && request.url().endsWith(`/api/orders/${trackingId}`),
        );

        await page.goto('/transact');
        await expect(page.getByRole('heading', { name: 'Place a trade' })).toBeVisible();
        await page.getByRole('button', { name: 'Open Orders' }).click();
        const trackingIdCell = page.getByRole('button', { name: trackingId });
        await expect(trackingIdCell).toBeVisible();

        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect((await cancelRequest).postDataJSON()).toEqual({});
        await expect(page.getByRole('status')).toContainText(`Order ${trackingId} canceled.`);
        await expect(trackingIdCell).not.toBeVisible();
    });
});

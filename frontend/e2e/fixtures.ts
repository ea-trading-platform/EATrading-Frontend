import { Page, Route } from '@playwright/test';

export const clientId = 'd7274a95-fd81-4a0b-be3e-682b3722111b';
export const trackingId = '550e8400-e29b-41d4-a716-446655440099';

export async function mockAuthenticatedClient(page: Page): Promise<void> {
    await page.addInitScript(({ clientId }) => {
        const payload = btoa(JSON.stringify({
            exp: Math.floor(Date.now() / 1000) + 3600,
            role: 'CLIENT',
        })).replace(/=+$/, '');
        localStorage.setItem('accessToken', `header.${payload}.signature`);
        localStorage.setItem('refreshToken', 'mock-refresh-token');
        localStorage.setItem('clientId', clientId);
        localStorage.setItem('user', JSON.stringify({
            id: clientId,
            clientId,
            email: 'trader@example.com',
            role: 'CLIENT',
            user_metadata: { name: 'Test Trader', balance: 100000 },
        }));
    }, { clientId });
}

export async function mockTradingApi(page: Page): Promise<void> {
    let orderStatus: 'PENDING' | 'CANCELED' = 'PENDING';

    await page.route('**/api/**', async (route: Route) => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;

        if (request.method() === 'POST' && path === '/api/v1/auth/register') {
            const payload = btoa(JSON.stringify({
                exp: Math.floor(Date.now() / 1000) + 3600,
                email: 'test@eatrading.com',
                role: 'CLIENT',
            })).replace(/=+$/, '');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    accessToken: `header.${payload}.signature`,
                    refreshToken: 'mock-refresh-token',
                    clientId,
                    role: 'CLIENT',
                }),
            });
            return;
        }

        if (request.method() === 'PATCH' && path.endsWith(`/api/orders/${trackingId}`)) {
            orderStatus = 'CANCELED';
            await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
            return;
        }

        if (request.method() === 'GET' && path === '/api/clients') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: clientId,
                    name: 'Test Trader',
                    email: 'trader@example.com',
                    totalBalance: 100000,
                }),
            });
            return;
        }

        if (request.method() === 'GET' && path === '/api/orders') {
            const orders = orderStatus === 'PENDING'
                ? [{
                    id: 'order-1',
                    trackingId,
                    clientId,
                    symbol: 'AAPL',
                    name: 'Apple Inc.',
                    quantity: 2,
                    orderType: 'BUY',
                    status: orderStatus,
                    price: 190.5,
                }]
                : [];
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orders) });
            return;
        }

        if (request.method() === 'GET' && path.startsWith('/api/v1/market/quotes/')) {
            const symbol = path.split('/').pop() ?? 'AAPL';
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ symbol, price: 190.5, previousClose: 188, change: 2.5, changePercent: 1.33, currency: 'USD' }),
            });
            return;
        }

        if (request.method() === 'GET' && path.startsWith('/api/v1/market/candles/')) {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candles: [] }) });
            return;
        }

        if (request.method() === 'GET' && path === '/api/portfolio') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ portfolioValueUsd: 100000, availableCashUsd: 80000, dailyChangeUsd: 25 }),
            });
            return;
        }

        if (request.method() === 'GET' && path === '/api/portfolio/history') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ points: [] }) });
            return;
        }

        if (request.method() === 'GET' && path === '/api/holdings') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
            return;
        }

        if (request.method() === 'GET' && path === '/api/clients/watchlist') {
            await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
            return;
        }

        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
}

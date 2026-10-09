// Production defaults. Overridden by environment.development.ts during `ng serve`.
export const environment = {
    production: true,
    apiBaseUrl: 'http://10.23.137.152:8099',
    marketauxApiKey: 'YOUR_MARKETAUX_API_KEY',
    // API endpoints configuration
    endpoints: {
        // User management
        users: '/api/users',
        // Market data
        market: {
            quotes: '/api/v1/market/quotes',
            candles: '/api/v1/market/candles',
            spread: '/api/v1/market/spread',
            changes: '/api/v1/market/changes',
            price: '/api/v1/market/price',
            health: '/api/v1/market/health',
            usage: '/api/v1/market/usage',
            cache: '/api/v1/market/cache'
        },
        // Client management
        clients: '/api/clients',
        // Holdings
        holdings: '/api/holdings',
        // Orders & transactions
        orders: '/api/orders',
        transact: '/api/orders/transact'
    }
};


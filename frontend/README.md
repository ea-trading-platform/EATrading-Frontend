# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.5.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Dashboard daily movers

The dashboard loads gainers and losers from `GET /api/v1/market/movers` using the
configured backend URL. It rotates between the returned rankings every five
seconds without refetching. Prices are raw daily closes; percentage changes are
the backend's adjusted-close returns, not intraday quote returns. No mock
sparkline history or company names are supplied by the frontend.

Each entry shows its currency, comparison dates, and any synthetic, stale, or
partial flags. Unavailable symbols and empty rankings are displayed explicitly.
Failed requests show an error with a Retry button. The endpoint ranks a curated
25-stock watchlist, not live popularity; rankings may contain fewer than five
stocks. A cold backend request can require 25 upstream calls, while repeated
requests reuse its candle cache (six-hour TTL by default).

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'pnpm run build && pnpm run preview',
		port: 4173,
		env: {
			...process.env,
			// Relaxes CSP for this preview build. Production builds keep default-src none.
			E2E: '1'
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});

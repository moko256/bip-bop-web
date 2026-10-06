import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import inlangSettings from './project.inlang/settings.json' with { type: 'json' };
import { siteBase, siteHost, siteProtocol } from './site-url.ts';

export default defineConfig(({ command }) => {
	const isRelease = command === 'build';
	const isE2E = process.env.E2E === '1';

	return {
		css: {
			transformer: 'lightningcss',
			preprocessorOptions: {
				scss: {
					// Pico's Sass `if()` calls warn on modern Sass.
					quietDeps: true
				}
			}
		},
		build: {
			cssMinify: 'lightningcss'
		},
		plugins: [
			sveltekit({
				prerender: {
					entries: ['*', '/fullscreen']
				},
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},
				adapter: adapter({
					fallback: '404.html'
				}),
				paths: {
					assets: `${siteProtocol}://${siteHost}${siteBase}`,
					base: siteBase
				},
				csp: {
					directives:
						isE2E || !isRelease
							? {
									// Vite's dev modules and HMR need sources production does not allow.
								}
							: {
									// Fetch directives fall back to this.
									'default-src': ['none'],
									// Same-origin modules and stylesheets. Inline startup hashes are appended.
									'script-src': ['self'],
									'style-src': ['self'],
									// Prerendered style attributes. 'self' does not allow them.
									'style-src-attr': ['unsafe-inline'],
									// Favicons, the inlined SVG icon, and CSS data-URI icons.
									'img-src': ['self', 'data:'],
									// Canvas text uses an inlined woff2 data URL.
									'font-src': ['data:'],
									// Generated playback is a blob URL.
									'media-src': ['blob:'],
									// These directives do not fall back to default-src.
									// Prerendered pages emit CSP as a meta tag, which drops frame-ancestors.
									'base-uri': ['none'],
									'form-action': ['none'],
									'frame-ancestors': ['none'],
									'upgrade-insecure-requests': true
								},
					mode: 'hash'
				}
			}),

			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/paraglide',
				emitTsDeclarations: true,
				strategy: ['url', 'preferredLanguage', 'baseLocale'],
				urlPatterns: [
					{
						pattern: `${siteBase}/fullscreen`,
						localized: [
							['en', `${siteBase}/fullscreen`],
							['ja', `${siteBase}/fullscreen`]
						]
					},
					{
						pattern: `${siteBase}/:path(.*)?`,
						localized: inlangSettings.locales.map((lang) => {
							return [lang, `${siteBase}/${lang}/:path(.*)?`];
						})
					}
				]
			})
		],
		test: {
			expect: { requireAssertions: true },
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium', headless: true }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**']
					}
				},

				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});

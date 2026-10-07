import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TopPage from './+page.svelte';

const currentPage = vi.hoisted(() => new URL('https://moko256.github.io/bip-bop-web/ja/foo?x=1#y'));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return currentPage;
		}
	}
}));

function themeColor(scheme: 'light' | 'dark'): string | null | undefined {
	return document
		.querySelector(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`)
		?.getAttribute('content');
}

function alternateHref(hreflang: string): string | null | undefined {
	return document
		.querySelector(`link[rel="alternate"][hreflang="${hreflang}"]`)
		?.getAttribute('href');
}

describe('top page', () => {
	it('publishes localized links, the noscript note, and the source link', async () => {
		render(TopPage);

		await expect
			.element(page.getByRole('heading', { level: 1, name: m.site_title() }))
			.toBeVisible();
		expect(document.title).toBe(m.site_title());
		expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
			m.site_description()
		);
		expect(themeColor('light')).toBe('#ffffff');
		expect(themeColor('dark')).toBe('#13171f');
		expect(
			getComputedStyle(document.documentElement).getPropertyValue('--pico-background-color')
		).toBe('#fff');
		expect(getComputedStyle(document.documentElement).scrollbarGutter).toBe('stable');
		expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
			'https://moko256.github.io/bip-bop-web/ja/foo?x=1#y'
		);
		expect(alternateHref('en')).toBe('https://moko256.github.io/bip-bop-web/en/foo?x=1#y');
		expect(alternateHref('ja')).toBe('https://moko256.github.io/bip-bop-web/ja/foo?x=1#y');
		expect(alternateHref('x-default')).toBe('https://moko256.github.io/bip-bop-web/en/foo?x=1#y');

		const localeAnchor = document.querySelector('.locale-anchor');
		if (!(localeAnchor instanceof HTMLElement)) throw new Error('Expected locale anchor');
		expect(localeAnchor.getAttribute('data-sveltekit-reload')).toBe('');
		expect(getComputedStyle(localeAnchor).display).toBe('none');
		expect(
			[...localeAnchor.querySelectorAll('a')].map((anchor) => [
				anchor.textContent,
				anchor.getAttribute('href')
			])
		).toEqual([
			['en', '/bip-bop-web/en/foo'],
			['ja', '/bip-bop-web/ja/foo']
		]);

		const source = page.getByRole('link', { name: m.footer_source_link_title() });
		await expect.element(source).toHaveAttribute('href', 'https://github.com/moko256/bip-bop-web');
		expect(source.element().closest('footer')).not.toBeNull();

		const main = document.querySelector('main');
		if (!(main instanceof HTMLElement)) throw new Error('Expected main');
		expect([...main.children].map((child) => child.tagName)).toEqual(['DIV', 'FOOTER']);
		expect(main.children[0]?.querySelector('noscript')).not.toBeNull();
		expect(main.getBoundingClientRect().height).toBeGreaterThanOrEqual(window.innerHeight - 1);
	});
});

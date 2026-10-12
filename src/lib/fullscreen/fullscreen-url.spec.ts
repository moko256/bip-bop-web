import { describe, expect, it } from 'vitest';
import { fullscreenDocumentTitle, fullscreenPageUrl } from './fullscreen-url';

describe('fullscreenPageUrl', () => {
	it('uses the current origin and drops the locale, query, and hash', () => {
		const current = new URL('https://moko256.github.io/bip-bop-web/ja/foo?x=1#y');

		expect(fullscreenPageUrl(current, null).href).toBe(
			'https://moko256.github.io/bip-bop-web/fullscreen'
		);
	});

	it('keeps a local origin while developing', () => {
		const current = new URL('http://localhost:5173/bip-bop-web/en/');

		expect(fullscreenPageUrl(current, null).href).toBe(
			'http://localhost:5173/bip-bop-web/fullscreen'
		);
	});

	it('adds the resolution query', () => {
		const current = new URL('https://moko256.github.io/bip-bop-web/ja/');

		expect(fullscreenPageUrl(current, '1920x1080').href).toBe(
			'https://moko256.github.io/bip-bop-web/fullscreen?resolution=1920x1080'
		);
	});
});

describe('fullscreenDocumentTitle', () => {
	it('uses the site title alone when the page draws at the DOM size', () => {
		expect(fullscreenDocumentTitle('Bip Bop Web', null)).toBe('Bip Bop Web');
	});

	it('appends the accepted bitmap size', () => {
		expect(fullscreenDocumentTitle('Bip Bop Web', { width: 1920, height: 1080 })).toBe(
			'Bip Bop Web (1920x1080)'
		);
	});
});

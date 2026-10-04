import { describe, expect, it } from 'vitest';
import {
	fullscreenDocumentTitle,
	fullscreenPageUrl,
	parseFullscreenResolution
} from './fullscreen-url';

describe('parseFullscreenResolution', () => {
	it('reads width and height when both sides are from 1 through 8000', () => {
		expect(parseFullscreenResolution('1920x1080')).toEqual({ width: 1920, height: 1080 });
		expect(parseFullscreenResolution('1x1')).toEqual({ width: 1, height: 1 });
		expect(parseFullscreenResolution('8000x8000')).toEqual({ width: 8000, height: 8000 });
		expect(parseFullscreenResolution('8000x1')).toEqual({ width: 8000, height: 1 });
		expect(parseFullscreenResolution('1x8000')).toEqual({ width: 1, height: 8000 });
	});

	it('returns null when the value is missing or outside the rule', () => {
		expect(parseFullscreenResolution(null)).toBeNull();
		expect(parseFullscreenResolution('')).toBeNull();
		expect(parseFullscreenResolution('8001x100')).toBeNull();
		expect(parseFullscreenResolution('100x8001')).toBeNull();
		expect(parseFullscreenResolution('0x100')).toBeNull();
		expect(parseFullscreenResolution('1920X1080')).toBeNull();
		expect(parseFullscreenResolution('1920.5x1080')).toBeNull();
		expect(parseFullscreenResolution('01920x1080')).toBeNull();
		expect(parseFullscreenResolution('1920x1080extra')).toBeNull();
		expect(parseFullscreenResolution(' 1920x1080')).toBeNull();
	});
});

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

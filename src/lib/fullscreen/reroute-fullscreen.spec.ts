import { describe, expect, it } from 'vitest';
import { reroutePathname } from './reroute-fullscreen';

describe('reroutePathname', () => {
	it('keeps localized fullscreen paths unmatched', () => {
		expect(reroutePathname(new URL('https://moko256.github.io/bip-bop-web/ja/fullscreen'))).toBe(
			'/bip-bop-web/ja/fullscreen'
		);
		expect(reroutePathname(new URL('https://moko256.github.io/bip-bop-web/en/fullscreen'))).toBe(
			'/bip-bop-web/en/fullscreen'
		);
		expect(reroutePathname(new URL('https://moko256.github.io/bip-bop-web/ja/fullscreen/'))).toBe(
			'/bip-bop-web/ja/fullscreen/'
		);
	});

	it('de-localizes other pages', () => {
		expect(reroutePathname(new URL('https://moko256.github.io/bip-bop-web/ja/'))).toBe(
			'/bip-bop-web/'
		);
		expect(reroutePathname(new URL('https://moko256.github.io/bip-bop-web/fullscreen'))).toBe(
			'/bip-bop-web/fullscreen'
		);
	});
});

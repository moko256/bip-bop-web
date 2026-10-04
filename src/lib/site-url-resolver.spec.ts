import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentPageAbsoluteUrl } from './site-url-resolver';

const kit = vi.hoisted(() => ({
	building: false,
	url: new URL('http://localhost:4173/bip-bop-web/en/')
}));

vi.mock('$app/env', () => ({
	get building() {
		return kit.building;
	}
}));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return kit.url;
		}
	}
}));

describe('currentPageAbsoluteUrl', () => {
	beforeEach(() => {
		kit.building = false;
		kit.url = new URL('http://localhost:4173/bip-bop-web/en/');
	});

	it('keeps the address the visitor is on', () => {
		kit.url = new URL('http://localhost:4173/bip-bop-web/ja/foo?x=1#y');

		expect(currentPageAbsoluteUrl().href).toBe('http://localhost:4173/bip-bop-web/ja/foo?x=1#y');
	});

	it('publishes a prerendered path on the public site', () => {
		kit.building = true;
		kit.url = new URL('http://sveltekit-prerender/bip-bop-web/ja/foo?x=1#y');

		expect(currentPageAbsoluteUrl().href).toBe(
			'https://moko256.github.io/bip-bop-web/ja/foo?x=1#y'
		);
	});
});

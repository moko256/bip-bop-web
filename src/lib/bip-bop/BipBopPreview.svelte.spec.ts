import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BipBopPreview from './BipBopPreview.svelte';

const originalDevicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');

function useDevicePixelRatio(value: number): void {
	Object.defineProperty(window, 'devicePixelRatio', {
		configurable: true,
		get: () => value
	});
}

describe('BipBopPreview', () => {
	afterEach(() => {
		if (originalDevicePixelRatio) {
			Object.defineProperty(window, 'devicePixelRatio', originalDevicePixelRatio);
		}
	});

	it('creates a canvas at the host size times devicePixelRatio, draws it, and places it in the host', async () => {
		useDevicePixelRatio(2);
		render(BipBopPreview);

		const canvas = page.getByLabelText('Bip-Bop preview');
		await expect.element(canvas).toBeVisible();
		await expect
			.poll(() => {
				const element = canvas.element() as HTMLCanvasElement;
				const host = element.parentElement;
				if (!host || host.clientWidth <= 0) return false;
				return (
					element.width === Math.round(host.clientWidth * 2) &&
					element.height === Math.round(host.clientHeight * 2)
				);
			})
			.toBe(true);

		const element = canvas.element() as HTMLCanvasElement;
		const host = element.parentElement!;

		expect(element.isConnected).toBe(true);
		expect(host.contains(element)).toBe(true);
		expect(element.clientWidth).toBe(host.clientWidth);
		expect(element.clientHeight).toBe(host.clientHeight);
		expect(element.width).toBeGreaterThan(element.clientWidth);
		expect(element.getContext('2d', { alpha: false })?.imageSmoothingEnabled).toBe(false);
		expect(getComputedStyle(element).imageRendering).toBe('pixelated');
	});
});

import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BipBopStill from './BipBopStill.svelte';

const originalDevicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');

function useDevicePixelRatio(value: number): void {
	Object.defineProperty(window, 'devicePixelRatio', {
		configurable: true,
		get: () => value
	});
}

function rgb(canvas: HTMLCanvasElement, x: number, y: number): string {
	const pixel = canvas.getContext('2d', { alpha: false })?.getImageData(x, y, 1, 1).data;
	if (!pixel) return '';
	return `${pixel[0]},${pixel[1]},${pixel[2]}`;
}

describe('BipBopStill', () => {
	afterEach(() => {
		if (originalDevicePixelRatio) {
			Object.defineProperty(window, 'devicePixelRatio', originalDevicePixelRatio);
		}
	});

	it('draws frame 0 at the bitmap size and lets CSS scale the canvas', async () => {
		useDevicePixelRatio(2);
		const view = await render(BipBopStill, { width: 1920, height: 1080 });
		const host = view.container as HTMLElement;
		host.style.width = '320px';
		host.style.height = '180px';

		const canvas = host.querySelector('canvas') as HTMLCanvasElement;
		expect(canvas.getAttribute('aria-hidden')).toBe('true');
		expect(canvas.width).toBe(1920);
		expect(canvas.height).toBe(1080);
		await expect.poll(() => canvas.clientWidth).toBe(320);
		expect(canvas.clientHeight).toBe(180);
		expect(getComputedStyle(canvas).objectFit).toBe('contain');
		expect(getComputedStyle(canvas).imageRendering).not.toBe('pixelated');

		// 75% white swatch and the frame-0 sector on a 1920×1080 bitmap.
		await expect.poll(() => rgb(canvas, 40, 990)).toBe('191,191,191');
		expect(rgb(canvas, 960, 540)).toBe('255,255,255');
		expect(canvas.getContext('2d', { alpha: false })?.imageSmoothingEnabled).toBe(false);

		await view.rerender({ width: 720, height: 480 });

		await expect.poll(() => `${canvas.width}x${canvas.height}`).toBe('720x480');
		expect(canvas.clientWidth).toBe(320);
		expect(canvas.clientHeight).toBe(180);
		// Same swatch and sector after the bitmap follows 720×480.
		await expect.poll(() => rgb(canvas, 20, 440)).toBe('191,191,191');
		expect(rgb(canvas, 360, 240)).toBe('255,255,255');
	});
});

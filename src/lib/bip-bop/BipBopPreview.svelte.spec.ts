import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BipBopPreview from './BipBopPreview.svelte';

function deviceContentBox(element: Element): Promise<ResizeObserverSize> {
	return new Promise((resolve, reject) => {
		const observer = new ResizeObserver((entries) => {
			const box = entries[0]?.devicePixelContentBoxSize?.[0];
			observer.disconnect();
			if (!box) {
				reject(new Error('devicePixelContentBoxSize was empty'));
				return;
			}
			resolve(box);
		});
		observer.observe(element, { box: 'device-pixel-content-box' });
	});
}

describe('BipBopPreview', () => {
	it('creates a canvas at the host device-pixel size, draws it, and places it in the host', async () => {
		render(BipBopPreview);

		const canvas = page.getByLabelText('Bip-Bop preview');
		await expect.element(canvas).toBeVisible();
		await expect.poll(() => (canvas.element() as HTMLCanvasElement).width).toBeGreaterThan(0);

		const element = canvas.element() as HTMLCanvasElement;
		const host = element.parentElement;
		expect(host).toBeTruthy();
		const box = await deviceContentBox(host!);

		expect(element.isConnected).toBe(true);
		expect(host!.contains(element)).toBe(true);
		expect(element.width).toBe(Math.round(box.inlineSize));
		expect(element.height).toBe(Math.round(box.blockSize));
		expect(element.clientWidth).toBe(host!.clientWidth);
		expect(element.clientHeight).toBe(host!.clientHeight);
		expect(element.getContext('2d', { alpha: false })?.imageSmoothingEnabled).toBe(false);
		expect(getComputedStyle(element).imageRendering).toBe('pixelated');
	});
});

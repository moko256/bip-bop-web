import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FullscreenPicture from './FullscreenPicture.svelte';

const originalDevicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
const originalRequestFullscreen = document.documentElement.requestFullscreen;
const originalExitFullscreen = document.exitFullscreen;

function useDevicePixelRatio(value: number): void {
	Object.defineProperty(window, 'devicePixelRatio', {
		configurable: true,
		get: () => value
	});
}

function stage(): HTMLElement {
	const stageElement = page
		.getByLabelText(m.bip_bop_preview_aria())
		.element()
		.closest('.fullscreen-stage');
	if (!(stageElement instanceof HTMLElement)) throw new Error('Expected fullscreen stage');
	return stageElement;
}

function frame(): HTMLElement {
	const frameElement = stage().querySelector('.frame');
	if (!(frameElement instanceof HTMLElement)) throw new Error('Expected frame');
	return frameElement;
}

describe('FullscreenPicture', () => {
	afterEach(() => {
		if (originalDevicePixelRatio) {
			Object.defineProperty(window, 'devicePixelRatio', originalDevicePixelRatio);
		}
		document.documentElement.requestFullscreen = originalRequestFullscreen;
		document.exitFullscreen = originalExitFullscreen;
	});

	it('draws the viewport at device pixels when no resolution is set', async () => {
		useDevicePixelRatio(2);
		render(FullscreenPicture, { bitmap: null });

		const canvas = page.getByLabelText(m.bip_bop_preview_aria());
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
		expect(getComputedStyle(canvas.element()).imageRendering).toBe('pixelated');
		expect(getComputedStyle(stage()).backgroundColor).toBe('rgb(0, 0, 0)');
		expect(page.getByRole('slider').query()).toBeNull();
		expect(page.getByRole('spinbutton').query()).toBeNull();
		expect(page.getByRole('button', { name: m.playback_play() }).query()).toBeNull();
		expect(stage().querySelector('svg')).not.toBeNull();
	});

	it('draws the requested bitmap in the center and toggles play without leaving fullscreen', async () => {
		useDevicePixelRatio(3);
		const requestFullscreen = vi.fn().mockResolvedValue(undefined);
		const exitFullscreen = vi.fn().mockResolvedValue(undefined);
		document.documentElement.requestFullscreen = requestFullscreen;
		document.exitFullscreen = exitFullscreen;

		render(FullscreenPicture, { bitmap: { width: 320, height: 240 } });

		const canvas = page.getByLabelText(m.bip_bop_preview_aria());
		await expect.element(canvas).toBeVisible();
		await expect.poll(() => (canvas.element() as HTMLCanvasElement).width).toBe(320);
		expect((canvas.element() as HTMLCanvasElement).height).toBe(240);
		expect(getComputedStyle(frame()).aspectRatio).toBe('320 / 240');

		const stageBox = stage().getBoundingClientRect();
		const frameBox = frame().getBoundingClientRect();
		const horizontalGap = stageBox.width - frameBox.width;
		const verticalGap = stageBox.height - frameBox.height;
		expect(horizontalGap > 4 || verticalGap > 4).toBe(true);
		expect(
			Math.abs(frameBox.left - stageBox.left - (stageBox.right - frameBox.right))
		).toBeLessThan(2);
		expect(
			Math.abs(frameBox.top - stageBox.top - (stageBox.bottom - frameBox.bottom))
		).toBeLessThan(2);

		const outside =
			verticalGap > horizontalGap
				? { x: stageBox.left + stageBox.width / 2, y: stageBox.top + 1 }
				: { x: stageBox.left + 1, y: stageBox.top + stageBox.height / 2 };
		stage().dispatchEvent(
			new MouseEvent('click', { bubbles: true, clientX: outside.x, clientY: outside.y })
		);
		expect(stage().querySelector('svg')).not.toBeNull();
		expect(requestFullscreen).not.toHaveBeenCalled();

		await canvas.click();
		await expect.poll(() => stage().querySelector('svg')).toBeNull();
		expect(requestFullscreen).toHaveBeenCalledOnce();
		expect(exitFullscreen).not.toHaveBeenCalled();

		await canvas.click();
		await expect.poll(() => stage().querySelector('svg')).not.toBeNull();
		expect(requestFullscreen).toHaveBeenCalledOnce();
		expect(exitFullscreen).not.toHaveBeenCalled();
	});
});

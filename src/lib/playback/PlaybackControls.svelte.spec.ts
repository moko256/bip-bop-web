import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { pausePath, playArrowPath, playCirclePath } from './icons';
import { playbackTestContent } from './playback-test-content';
import PlaybackControls from './PlaybackControls.svelte';

function boxOf(element: Element) {
	return element.getBoundingClientRect();
}

describe('PlaybackControls', () => {
	it('places the transport under the cover, with the seek bar taking the remaining width', async () => {
		const playback: boolean[] = [];
		const frames: number[] = [];
		render(PlaybackControls, {
			playing: false,
			frame: 30,
			maxFrame: 600,
			fps: 60,
			onplaybackchange: (next: boolean) => playback.push(next),
			onframechange: (next: number) => frames.push(next),
			content: playbackTestContent
		});

		await expect.element(page.getByTestId('content')).toBeVisible();
		await expect.element(page.getByText('00:00 / 00:10')).toBeVisible();

		const veilElement = document.querySelector('.veil')!;
		const play = page.getByRole('button', { name: m.playback_play() });
		const progress = page.getByRole('slider', { name: m.playback_position_aria() });
		const clock = page.getByText('00:00 / 00:10');
		const input = page.getByRole('spinbutton', { name: m.frame_aria() });

		await expect.element(play).toBeVisible();
		expect(veilElement.querySelector('path')?.getAttribute('d')).toBe(playCirclePath);
		expect(play.element().querySelector('path')?.getAttribute('d')).toBe(playArrowPath);
		expect(getComputedStyle(clock.element()).fontFamily).toContain('monospace');

		const bar = progress.element();
		expect(bar.getAttribute('aria-valuenow')).toBe('30');
		expect(bar.getAttribute('aria-valuemin')).toBe('0');
		expect(bar.getAttribute('aria-valuemax')).toBe('600');
		await expect.element(input).toHaveValue(30);

		const veilBox = boxOf(veilElement);
		const transportBox = boxOf(play.element().parentElement!);
		expect(transportBox.top).toBeGreaterThanOrEqual(veilBox.bottom - 1);

		const playBox = boxOf(play.element());
		const progressBox = boxOf(bar);
		const clockBox = boxOf(clock.element());
		const inputBox = boxOf(input.element());
		const centers = [playBox, progressBox, clockBox, inputBox].map(
			(item) => item.top + item.height / 2
		);
		expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
		expect(progressBox.left).toBeGreaterThan(playBox.right - 1);
		expect(clockBox.left).toBeGreaterThan(progressBox.right - 1);
		expect(inputBox.left).toBeGreaterThan(clockBox.right - 1);
		expect(progressBox.width).toBeGreaterThan(playBox.width);
		expect(progressBox.width).toBeGreaterThan(clockBox.width);
		expect(progressBox.width).toBeGreaterThan(inputBox.width);

		await play.click();
		expect(playback).toEqual([true]);

		await input.fill('90');
		expect(frames.at(-1)).toBe(90);

		await input.fill('9999');
		expect(frames.at(-1)).toBe(600);
	});

	it('shows a pause icon and hours once playback reaches an hour', async () => {
		const view = await render(PlaybackControls, {
			playing: false,
			frame: 215999,
			maxFrame: 216000,
			fps: 60,
			onplaybackchange: () => undefined,
			onframechange: () => undefined,
			content: playbackTestContent
		});

		await expect.element(page.getByText('00:59:59 / 01:00:00')).toBeVisible();

		await view.rerender({
			playing: true,
			frame: 216000,
			maxFrame: 216000,
			fps: 60,
			onplaybackchange: () => undefined,
			onframechange: () => undefined,
			content: playbackTestContent
		});

		const pause = page.getByRole('button', { name: m.playback_pause() });
		await expect.element(pause).toBeVisible();
		expect(pause.element().querySelector('path')?.getAttribute('d')).toBe(pausePath);
		await expect.element(page.getByText('01:00:00 / 01:00:00')).toBeVisible();
		const playingField = page
			.getByRole('spinbutton', { name: m.frame_aria() })
			.element() as HTMLInputElement;
		expect(playingField.disabled).toBe(true);
		expect(playingField.value).toBe('');
		expect(document.querySelector('.veil')?.querySelector('path')).toBeNull();
	});
});

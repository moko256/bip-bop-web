import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { pausePath, playArrowPath, playCirclePath } from './icons';
import { playbackTestContent } from './playback-test-content';
import UnlimitedPlaybackControls from './UnlimitedPlaybackControls.svelte';

function boxOf(element: Element) {
	return element.getBoundingClientRect();
}

describe('UnlimitedPlaybackControls', () => {
	it('places play and the frame field under the cover, without a seek bar or a clock', async () => {
		const playback: boolean[] = [];
		const frames: number[] = [];
		render(UnlimitedPlaybackControls, {
			playing: false,
			frame: 30,
			onplaybackchange: (next: boolean) => playback.push(next),
			onframechange: (next: number) => frames.push(next),
			content: playbackTestContent
		});

		await expect.element(page.getByTestId('content')).toBeVisible();

		const veilElement = document.querySelector('.veil')!;
		const play = page.getByRole('button', { name: m.playback_play() });
		const input = page.getByRole('spinbutton', { name: m.frame_aria() });

		await expect.element(play).toBeVisible();
		expect(veilElement.querySelector('path')?.getAttribute('d')).toBe(playCirclePath);
		expect(play.element().querySelector('path')?.getAttribute('d')).toBe(playArrowPath);

		const transport = play.element().parentElement!;
		expect(transport.querySelector('progress')).toBeNull();
		expect(transport.textContent).not.toMatch(/\d{2}:\d{2}/);

		const field = input.element() as HTMLInputElement;
		await expect.element(input).toHaveValue(30);
		expect(field.hasAttribute('max')).toBe(false);
		expect(field.min).toBe('0');

		const veilBox = boxOf(veilElement);
		const transportBox = boxOf(transport);
		expect(transportBox.top).toBeGreaterThanOrEqual(veilBox.bottom - 1);

		const playBox = boxOf(play.element());
		const inputBox = boxOf(field);
		const centers = [playBox, inputBox].map((item) => item.top + item.height / 2);
		expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
		expect(inputBox.left).toBeGreaterThan(playBox.right - 1);

		await play.click();
		expect(playback).toEqual([true]);

		await input.fill('90');
		expect(frames.at(-1)).toBe(90);

		await input.fill('12.9');
		expect(frames.at(-1)).toBe(12);

		await input.fill('999999');
		expect(frames.at(-1)).toBe(999999);

		await input.fill('-4');
		expect(frames.at(-1)).toBe(0);
	});

	it('shows a pause icon while playing and stops from the transport', async () => {
		const playback: boolean[] = [];
		const onplaybackchange = (next: boolean) => playback.push(next);
		const view = await render(UnlimitedPlaybackControls, {
			playing: false,
			frame: 0,
			onplaybackchange,
			onframechange: () => undefined,
			content: playbackTestContent
		});

		await view.rerender({
			playing: true,
			frame: 216000,
			onplaybackchange,
			onframechange: () => undefined,
			content: playbackTestContent
		});

		const pause = page.getByRole('button', { name: m.playback_pause() });
		await expect.element(pause).toBeVisible();
		expect(pause.element().querySelector('path')?.getAttribute('d')).toBe(pausePath);
		const playingField = page
			.getByRole('spinbutton', { name: m.frame_aria() })
			.element() as HTMLInputElement;
		expect(playingField.disabled).toBe(true);
		expect(playingField.value).toBe('');
		expect(document.querySelector('.veil')?.querySelector('path')).toBeNull();
		expect(pause.element().parentElement?.querySelector('progress')).toBeNull();
		expect(pause.element().parentElement?.textContent).not.toMatch(/\d{2}:\d{2}/);

		await pause.click();
		expect(playback).toEqual([false]);
	});
});

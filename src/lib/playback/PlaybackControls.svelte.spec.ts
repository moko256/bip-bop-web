import * as m from '#lib/paraglide/messages.js';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { pausePath, playArrowPath, playCirclePath } from './icons';
import { playbackTestContent } from './playback-test-content';
import PlaybackControls from './PlaybackControls.svelte';
import { PlaybackSession, type PlaybackAdapter } from './PlaybackSession.svelte';

function boxOf(element: Element) {
	return element.getBoundingClientRect();
}

function idleAdapter(): PlaybackAdapter {
	return {
		start() {},
		stop() {},
		place() {},
		atEnd: () => false,
		dispose() {}
	};
}

function shownSession(options: {
	playing?: boolean;
	frame?: number;
	maxFrame?: number;
	fps?: number;
}) {
	const session = new PlaybackSession({
		maxFrame: options.maxFrame,
		fps: options.fps ?? 60,
		connect: () => idleAdapter()
	});
	session.frame = options.frame ?? 0;
	session.playing = options.playing ?? false;
	return session;
}

describe('PlaybackControls', () => {
	it('places the transport under the cover, with the seek bar taking the remaining width', async () => {
		const session = shownSession({ frame: 30, maxFrame: 600, fps: 60 });
		render(PlaybackControls, { session, content: playbackTestContent });

		await expect.element(page.getByTestId('content')).toBeVisible();
		await expect.element(page.getByText('00:00 / 00:10')).toBeVisible();

		const veilElement = document.querySelector('.veil')!;
		const play = page.getByRole('button', { name: m.playback_play() });
		const progress = page.getByRole('slider', { name: m.playback_position_aria() });
		const playbackTime = page.getByText('00:00 / 00:10');
		const input = page.getByRole('spinbutton', { name: m.frame_aria() });

		await expect.element(play).toBeVisible();
		expect(veilElement.querySelector('path')?.getAttribute('d')).toBe(playCirclePath);
		expect(play.element().querySelector('path')?.getAttribute('d')).toBe(playArrowPath);
		expect(getComputedStyle(playbackTime.element()).fontFamily).toContain('monospace');

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
		const timeBox = boxOf(playbackTime.element());
		const inputBox = boxOf(input.element());
		const centers = [playBox, progressBox, timeBox, inputBox].map(
			(item) => item.top + item.height / 2
		);
		expect(Math.max(...centers) - Math.min(...centers)).toBeLessThan(2);
		expect(progressBox.left).toBeGreaterThan(playBox.right - 1);
		expect(timeBox.left).toBeGreaterThan(progressBox.right - 1);
		expect(inputBox.left).toBeGreaterThan(timeBox.right - 1);
		expect(progressBox.width).toBeGreaterThan(playBox.width);
		expect(progressBox.width).toBeGreaterThan(timeBox.width);
		expect(progressBox.width).toBeGreaterThan(inputBox.width);

		await input.fill('90');
		expect(session.frame).toBe(90);

		await input.fill('9999');
		expect(session.frame).toBe(600);

		await play.click();
		expect(session.playing).toBe(true);
	});

	it('shows a pause icon and hours once playback reaches an hour', async () => {
		const view = await render(PlaybackControls, {
			session: shownSession({ frame: 215999, maxFrame: 216000, fps: 60 }),
			content: playbackTestContent
		});

		await expect.element(page.getByText('00:59:59 / 01:00:00')).toBeVisible();

		await view.rerender({
			session: shownSession({ playing: true, frame: 216000, maxFrame: 216000, fps: 60 }),
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

	it('places play and the frame field under the cover when the position has no length', async () => {
		const session = shownSession({ frame: 30 });
		render(PlaybackControls, { session, content: playbackTestContent });

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

		await input.fill('90');
		expect(session.frame).toBe(90);

		await input.fill('12.9');
		expect(session.frame).toBe(12);

		await input.fill('999999');
		expect(session.frame).toBe(999999);

		await input.fill('-4');
		expect(session.frame).toBe(0);

		await play.click();
		expect(session.playing).toBe(true);
	});

	it('shows a pause icon while playing and stops from the transport', async () => {
		const session = shownSession({ playing: true, frame: 216000 });
		const view = await render(PlaybackControls, {
			session: shownSession({ frame: 0 }),
			content: playbackTestContent
		});

		await view.rerender({ session, content: playbackTestContent });

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
		expect(session.playing).toBe(false);
	});
});

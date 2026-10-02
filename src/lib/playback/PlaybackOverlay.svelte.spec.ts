import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { playCirclePath } from './icons';
import { playbackTestContent } from './playback-test-content';
import PlaybackOverlay from './PlaybackOverlay.svelte';

function center(element: Element) {
	const box = element.getBoundingClientRect();
	return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

describe('PlaybackOverlay', () => {
	it('covers stopped content with a 30% black veil and a centered play mark', async () => {
		const changes: boolean[] = [];
		render(PlaybackOverlay, {
			playing: false,
			onplaybackchange: (next: boolean) => changes.push(next),
			content: playbackTestContent
		});

		const picture = page.getByTestId('content');
		await expect.element(picture).toBeVisible();

		const veilElement = document.querySelector('.veil')!;
		expect(veilElement).toBeTruthy();
		const mark = veilElement.querySelector('path');
		expect(mark?.getAttribute('d')).toBe(playCirclePath);
		expect(getComputedStyle(veilElement).backgroundColor).toBe('rgba(0, 0, 0, 0.3)');
		expect(getComputedStyle(veilElement).pointerEvents).toBe('none');

		const contentBox = picture.element().getBoundingClientRect();
		const veilBox = veilElement.getBoundingClientRect();
		expect(Math.abs(veilBox.top - contentBox.top)).toBeLessThan(1);
		expect(Math.abs(veilBox.left - contentBox.left)).toBeLessThan(1);
		expect(Math.abs(veilBox.width - contentBox.width)).toBeLessThan(1);
		expect(Math.abs(veilBox.height - contentBox.height)).toBeLessThan(1);

		const markBox = center(mark!);
		const veilCenter = center(veilElement);
		expect(Math.abs(markBox.x - veilCenter.x)).toBeLessThan(1);
		expect(Math.abs(markBox.y - veilCenter.y)).toBeLessThan(1);

		await picture.click();
		expect(changes).toEqual([true]);
	});

	it('drops the veil as soon as playback starts and stops on the next content click', async () => {
		const changes: boolean[] = [];
		const onplaybackchange = (next: boolean) => changes.push(next);
		const view = await render(PlaybackOverlay, {
			playing: false,
			onplaybackchange,
			content: playbackTestContent
		});

		await view.rerender({ playing: true, onplaybackchange, content: playbackTestContent });

		const veilElement = document.querySelector('.veil')!;
		expect(veilElement.querySelector('path')).toBeNull();
		expect(getComputedStyle(veilElement).backgroundColor).toBe('rgba(0, 0, 0, 0)');

		await page.getByTestId('content').click();
		expect(changes).toEqual([false]);
	});
});

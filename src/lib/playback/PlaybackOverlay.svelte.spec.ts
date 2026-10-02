import { createRawSnippet } from 'svelte';
import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { playCirclePath } from './icons';
import PlaybackOverlay from './PlaybackOverlay.svelte';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="content" style="width:100%;height:160px">picture</div>'
}));

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
			children
		});

		const content = page.getByTestId('content');
		const veil = page.getByRole('button', { name: m.playback_play() });
		await expect.element(content).toBeVisible();
		await expect.element(veil).toBeVisible();

		const button = veil.element();
		const mark = button.querySelector('path');
		expect(mark?.getAttribute('d')).toBe(playCirclePath);
		expect(getComputedStyle(button).backgroundColor).toBe('rgba(0, 0, 0, 0.3)');
		expect(getComputedStyle(button).transitionDuration).toBe('0s');

		const contentBox = content.element().getBoundingClientRect();
		const veilBox = button.getBoundingClientRect();
		expect(Math.abs(veilBox.top - contentBox.top)).toBeLessThan(1);
		expect(Math.abs(veilBox.left - contentBox.left)).toBeLessThan(1);
		expect(Math.abs(veilBox.width - contentBox.width)).toBeLessThan(1);
		expect(Math.abs(veilBox.height - contentBox.height)).toBeLessThan(1);

		const markBox = center(mark!);
		const veilCenter = center(button);
		expect(Math.abs(markBox.x - veilCenter.x)).toBeLessThan(1);
		expect(Math.abs(markBox.y - veilCenter.y)).toBeLessThan(1);

		await veil.click();
		expect(changes).toEqual([true]);
	});

	it('drops the veil as soon as playback starts and stops on the next click', async () => {
		const changes: boolean[] = [];
		const onplaybackchange = (next: boolean) => changes.push(next);
		const view = await render(PlaybackOverlay, {
			playing: false,
			onplaybackchange,
			children
		});

		await view.rerender({ playing: true, onplaybackchange, children });

		const veil = page.getByRole('button', { name: m.playback_pause() });
		await expect.element(veil).toBeVisible();
		expect(veil.element().querySelector('path')).toBeNull();
		expect(getComputedStyle(veil.element()).backgroundColor).toBe('rgba(0, 0, 0, 0)');

		await veil.click();
		expect(changes).toEqual([false]);
	});
});

import { page, userEvent } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SeekBar from './SeekBar.svelte';

function centerX(element: Element) {
	const box = element.getBoundingClientRect();
	return box.left + box.width / 2;
}

function pointer(target: Element, type: string, clientX: number, buttons = 1) {
	const box = target.getBoundingClientRect();
	target.dispatchEvent(
		new PointerEvent(type, {
			bubbles: true,
			cancelable: true,
			clientX,
			clientY: box.top + box.height / 2,
			button: 0,
			buttons,
			pointerId: 1,
			pointerType: 'mouse',
			isPrimary: true
		})
	);
}

async function mount(frame = 0, maxFrame = 100) {
	const frames: number[] = [];
	const view = await render(SeekBar, {
		frame,
		maxFrame,
		onframechange: (next: number) => frames.push(next)
	});
	view.container.style.display = 'flex';
	view.container.style.width = '320px';
	const slider = page.getByRole('slider', { name: '再生位置' });
	const bar = slider.element().querySelector('.bar');
	const knob = slider.element().querySelector('.knob');
	if (!bar || !knob) throw new Error('seek bar is missing its bar or knob');
	return { frames, view, slider, bar, knob };
}

describe('SeekBar', () => {
	it('draws a 4px rounded bar and a 12px knob inside padding that fits the 18px knob', async () => {
		const { slider, bar, knob } = await mount(0, 100);
		await userEvent.unhover(slider);

		const seek = slider.element();
		expect(seek.getAttribute('aria-valuenow')).toBe('0');
		expect(seek.getAttribute('aria-valuemin')).toBe('0');
		expect(seek.getAttribute('aria-valuemax')).toBe('100');

		const seekBox = slider.element().getBoundingClientRect();
		const barBox = bar.getBoundingClientRect();
		const knobBox = knob.getBoundingClientRect();
		const midY = barBox.top + barBox.height / 2;

		expect(Math.abs(barBox.height - 4)).toBeLessThan(0.6);
		expect(parseFloat(getComputedStyle(bar).borderTopLeftRadius)).toBeGreaterThanOrEqual(2);
		expect(Math.abs(knobBox.width - 12)).toBeLessThan(0.6);
		expect(Math.abs(knobBox.height - 12)).toBeLessThan(0.6);
		expect(parseFloat(getComputedStyle(knob).borderTopLeftRadius)).toBeGreaterThanOrEqual(6);
		expect(midY - seekBox.top).toBeGreaterThanOrEqual(8.5);
		expect(seekBox.bottom - midY).toBeGreaterThanOrEqual(8.5);
		expect(barBox.left - seekBox.left).toBeGreaterThanOrEqual(8.5);
		expect(seekBox.right - barBox.right).toBeGreaterThanOrEqual(8.5);
		expect(Math.abs(centerX(knob) - barBox.left)).toBeLessThan(1.5);
	});

	it('grows the bar and knob on hover, and does not animate the seek position', async () => {
		const { view, slider, bar, knob } = await mount(0, 100);

		const barTransition = getComputedStyle(bar);
		expect(barTransition.transitionProperty).toBe('height');
		expect(parseFloat(barTransition.transitionDuration)).toBeGreaterThan(0);

		const knobProperties = getComputedStyle(knob)
			.transitionProperty.split(',')
			.map((property) => property.trim());
		expect(knobProperties).toEqual(['width', 'height']);
		expect(parseFloat(getComputedStyle(knob).transitionDuration)).toBeGreaterThan(0);

		await userEvent.hover(slider);
		await expect.poll(() => Math.abs(bar.getBoundingClientRect().height - 6)).toBeLessThan(0.6);
		await expect.poll(() => Math.abs(knob.getBoundingClientRect().width - 18)).toBeLessThan(0.6);
		await expect.poll(() => Math.abs(knob.getBoundingClientRect().height - 18)).toBeLessThan(0.6);

		const before = centerX(knob);
		await view.rerender({
			frame: 100,
			maxFrame: 100,
			onframechange: () => undefined
		});
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		const after = centerX(knob);
		expect(after - before).toBeGreaterThan(100);
		expect(Math.abs(after - bar.getBoundingClientRect().right)).toBeLessThan(1.5);
	});

	it('moves the knob to a click on the bar and leaves it there while the pointer moves', async () => {
		const { frames, slider, bar } = await mount(0, 100);
		const box = bar.getBoundingClientRect();

		await slider.click({
			position: {
				x: box.left - slider.element().getBoundingClientRect().left + box.width / 2,
				y: slider.element().getBoundingClientRect().height / 2
			}
		});
		expect(frames).toEqual([50]);

		pointer(bar, 'pointerdown', box.left + box.width * 0.25);
		expect(frames.at(-1)).toBe(25);
		pointer(bar, 'pointermove', box.left + box.width * 0.8);
		pointer(bar, 'pointerup', box.left + box.width * 0.8, 0);
		expect(frames).toEqual([50, 25]);
	});

	it('steps the frame from the keyboard', async () => {
		const { frames, slider } = await mount(10, 100);
		slider
			.element()
			.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		slider.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
		slider.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		expect(frames).toEqual([11, 0, 100]);
	});

	it('follows the pointer with the knob only while the knob is held', async () => {
		const { frames, bar, knob } = await mount(0, 100);
		const box = bar.getBoundingClientRect();

		pointer(knob, 'pointerdown', box.left);
		pointer(knob, 'pointermove', box.left + box.width * 0.4);
		expect(frames).toEqual([40]);
		pointer(knob, 'pointermove', box.left + box.width * 0.9);
		expect(frames).toEqual([40, 90]);
		pointer(knob, 'pointerup', box.left + box.width * 0.9, 0);
		pointer(knob, 'pointermove', box.left + box.width * 0.1);
		expect(frames).toEqual([40, 90]);
	});
});

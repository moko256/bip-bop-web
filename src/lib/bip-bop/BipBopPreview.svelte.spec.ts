import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BipBopPreview from './BipBopPreview.svelte';

type StartedTone = {
	frequencyHz: number;
	start: number;
	stop: number;
};

class PreviewAudioContext {
	static instances: PreviewAudioContext[] = [];

	state: AudioContextState = 'running';
	currentTime = 0;
	destination = {} as AudioDestinationNode;
	tones: StartedTone[] = [];

	constructor() {
		PreviewAudioContext.instances.push(this);
	}

	createOscillator(): OscillatorNode {
		const tone: StartedTone = { frequencyHz: 0, start: 0, stop: 0 };
		this.tones.push(tone);
		return {
			type: 'sine',
			frequency: {
				set value(next: number) {
					tone.frequencyHz = next;
				},
				get value() {
					return tone.frequencyHz;
				}
			},
			connect: () => undefined,
			disconnect: () => undefined,
			addEventListener: () => undefined,
			start: (when = 0) => {
				tone.start = when;
			},
			stop: (when = 0) => {
				tone.stop = when;
			}
		} as unknown as OscillatorNode;
	}

	resume(): Promise<void> {
		this.state = 'running';
		return Promise.resolve();
	}

	close(): Promise<void> {
		this.state = 'closed';
		return Promise.resolve();
	}

	addEventListener(): void {}

	removeEventListener(): void {}
}

const originalDevicePixelRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
const originalAudioContext = window.AudioContext;

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
		window.AudioContext = originalAudioContext;
		PreviewAudioContext.instances = [];
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

	it('plays a 16ms Bip at the preview start, then schedules Bop for the next second', async () => {
		PreviewAudioContext.instances = [];
		const realAudioContext = window.AudioContext;
		window.AudioContext = PreviewAudioContext as unknown as typeof AudioContext;

		try {
			render(BipBopPreview);

			await expect
				.poll(() => PreviewAudioContext.instances[0]?.tones.length ?? 0)
				.toBeGreaterThan(0);

			const audio = PreviewAudioContext.instances[0]!;
			const opening = audio.tones[0]!;
			expect(opening.frequencyHz).toBe(1500);
			expect(opening.start).toBeCloseTo(0);
			expect(opening.stop - opening.start).toBeCloseTo(0.016);

			await expect.poll(() => audio.tones.length).toBeGreaterThan(1);
			const next = audio.tones[1]!;
			expect(next.frequencyHz).toBe(475);
			expect(next.start).toBeCloseTo(0.984);
			expect(next.stop - next.start).toBeCloseTo(0.016);
		} finally {
			window.AudioContext = realAudioContext;
		}
	});
});

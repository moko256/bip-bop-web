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
	static outputLatencySeconds = 0;

	state: AudioContextState = 'running';
	currentTime = 0;
	destination = {} as AudioDestinationNode;
	outputLatency: number;
	latencyHint: AudioContextLatencyCategory | number | undefined;
	tones: StartedTone[] = [];

	constructor(options?: AudioContextOptions) {
		this.outputLatency = PreviewAudioContext.outputLatencySeconds;
		this.latencyHint = options?.latencyHint;
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
		PreviewAudioContext.outputLatencySeconds = 0;
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

	it('stays stopped until play, then plays a 16ms Bip and schedules Bop', async () => {
		PreviewAudioContext.instances = [];
		const realAudioContext = window.AudioContext;
		window.AudioContext = PreviewAudioContext as unknown as typeof AudioContext;

		try {
			render(BipBopPreview);

			await expect.element(page.getByRole('button', { name: '再生' }).first()).toBeVisible();
			expect(PreviewAudioContext.instances).toHaveLength(0);

			await page.getByRole('button', { name: '再生' }).first().click();

			await expect
				.poll(() => PreviewAudioContext.instances[0]?.tones.length ?? 0)
				.toBeGreaterThan(0);

			const audio = PreviewAudioContext.instances[0]!;
			expect(audio.latencyHint).toBe('playback');
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

	function frameValue(): number {
		const input = page.getByRole('spinbutton', { name: 'フレーム' }).element() as HTMLInputElement;
		return input.valueAsNumber;
	}

	it('prepares the opening burst before the picture moves by outputLatency', async () => {
		PreviewAudioContext.instances = [];
		PreviewAudioContext.outputLatencySeconds = 1;
		const realAudioContext = window.AudioContext;
		window.AudioContext = PreviewAudioContext as unknown as typeof AudioContext;

		try {
			render(BipBopPreview);
			await expect.element(page.getByRole('button', { name: '再生' }).first()).toBeVisible();

			const started = Date.now();
			await page.getByRole('button', { name: '再生' }).first().click();

			await expect
				.poll(() => PreviewAudioContext.instances[0]?.tones.length ?? 0)
				.toBeGreaterThan(1);

			const audio = PreviewAudioContext.instances[0]!;
			expect(audio.latencyHint).toBe('playback');
			expect(audio.tones[0]?.start).toBeCloseTo(0);
			expect(audio.tones[0]?.frequencyHz).toBe(1500);
			expect(audio.tones[1]?.start).toBeCloseTo(0.984);
			expect(audio.tones[1]?.frequencyHz).toBe(475);
			expect(frameValue()).toBe(0);
			expect(Date.now() - started).toBeLessThan(1000);

			await expect.poll(() => frameValue(), { timeout: 3000 }).toBeGreaterThan(0);
			expect(Date.now() - started).toBeGreaterThanOrEqual(1000);
		} finally {
			window.AudioContext = realAudioContext;
		}
	});

	it('starts a mid-second burst early and lets the picture move immediately', async () => {
		PreviewAudioContext.instances = [];
		PreviewAudioContext.outputLatencySeconds = 0.4;
		const realAudioContext = window.AudioContext;
		window.AudioContext = PreviewAudioContext as unknown as typeof AudioContext;

		try {
			render(BipBopPreview);
			const input = page.getByRole('spinbutton', { name: 'フレーム' });
			await expect.element(input).toBeVisible();
			await input.fill('30');
			await expect.element(input).toHaveValue(30);

			const started = Date.now();
			await page.getByRole('button', { name: '再生' }).first().click();

			await expect
				.poll(() => PreviewAudioContext.instances[0]?.tones.length ?? 0)
				.toBeGreaterThan(0);

			const opening = PreviewAudioContext.instances[0]!.tones[0]!;
			expect(opening.frequencyHz).toBe(475);
			expect(opening.start).toBeCloseTo(0.1);
			expect(opening.stop - opening.start).toBeCloseTo(0.016);

			await expect.poll(() => frameValue()).toBeGreaterThan(30);
			expect(Date.now() - started).toBeLessThan(400);
		} finally {
			window.AudioContext = realAudioContext;
		}
	});

	it('seeks a stopped 10 second preview from the frame field', async () => {
		render(BipBopPreview);

		await expect.element(page.getByText('00:00 / 00:10')).toBeVisible();
		const input = page.getByRole('spinbutton', { name: 'フレーム' });
		await expect.element(input).toHaveValue(0);

		await input.fill('120');

		await expect.element(page.getByText('00:02 / 00:10')).toBeVisible();
		await expect.element(input).toHaveValue(120);
		const progress = page
			.getByRole('progressbar', { name: '再生位置' })
			.element() as HTMLProgressElement;
		expect(progress.value).toBe(120);
		expect(progress.max).toBe(600);
	});
});

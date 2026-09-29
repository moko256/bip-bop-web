import { describe, expect, it } from 'vitest';
import { BipBopAudioRenderer } from './audio';

const SAMPLE_RATE = 48000;
const TONE_FRAMES = 768;

async function renderTone(delayMs: number, frequencyHz: number): Promise<Float32Array> {
	const context = new OfflineAudioContext(1, TONE_FRAMES * 2, SAMPLE_RATE);
	BipBopAudioRenderer(context, delayMs, frequencyHz);
	const buffer = await context.startRendering();
	return buffer.getChannelData(0);
}

function rms(samples: Float32Array, start: number, frameCount: number): number {
	let sum = 0;
	for (let index = 0; index < frameCount; index += 1) {
		const sample = samples[start + index] ?? 0;
		sum += sample * sample;
	}
	return Math.sqrt(sum / frameCount);
}

function correlation(
	samples: Float32Array,
	frequencyHz: number,
	start: number,
	frameCount: number
): number {
	let sum = 0;
	for (let index = 0; index < frameCount; index += 1) {
		const sample = samples[start + index] ?? 0;
		sum += sample * Math.sin((2 * Math.PI * frequencyHz * index) / SAMPLE_RATE);
	}
	return Math.abs(sum) / frameCount;
}

describe('BipBopAudioRenderer', () => {
	it('writes a 16ms 1500Hz sine at currentTime when the delay is 0', async () => {
		const samples = await renderTone(0, 1500);

		expect(rms(samples, 0, TONE_FRAMES)).toBeGreaterThan(0.5);
		expect(rms(samples, TONE_FRAMES, TONE_FRAMES)).toBeLessThan(0.001);
		expect(correlation(samples, 1500, 0, TONE_FRAMES)).toBeGreaterThan(0.4);
		expect(correlation(samples, 475, 0, TONE_FRAMES)).toBeLessThan(0.05);
	});

	it('writes a 16ms 475Hz sine that many milliseconds after currentTime', async () => {
		const samples = await renderTone(16, 475);

		expect(rms(samples, 0, TONE_FRAMES)).toBeLessThan(0.001);
		expect(rms(samples, TONE_FRAMES, TONE_FRAMES)).toBeGreaterThan(0.5);
		expect(correlation(samples, 475, TONE_FRAMES, TONE_FRAMES)).toBeGreaterThan(0.4);
		expect(correlation(samples, 1500, TONE_FRAMES, TONE_FRAMES)).toBeLessThan(0.05);
	});
});

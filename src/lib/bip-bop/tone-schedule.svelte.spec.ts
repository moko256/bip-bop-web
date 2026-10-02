import type { AudioSample, AudioSampleSource } from 'mediabunny';
import { describe, expect, it } from 'vitest';
import { placeBipBopTone } from './tone-schedule';

function correlation(samples: Float32Array, frequencyHz: number, sampleRate: number): number {
	const frameCount = Math.min(samples.length, Math.round(sampleRate * 0.016));
	let sum = 0;
	for (let index = 0; index < frameCount; index += 1) {
		const sample = samples[index] ?? 0;
		sum += sample * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
	}
	return Math.abs(sum) / frameCount;
}

function recordingSource() {
	const samples: AudioSample[] = [];
	const source = {
		async add(sample: AudioSample) {
			samples.push(sample.clone());
		}
	};
	return { source: source as unknown as AudioSampleSource, samples };
}

describe('placeBipBopTone', () => {
	it('places a 1500Hz Bip on an even second and a 475Hz Bop on an odd second', async () => {
		const even = recordingSource();
		const odd = recordingSource();
		await placeBipBopTone(even.source, 0);
		await placeBipBopTone(odd.source, 1);

		const bip = even.samples[0];
		const bop = odd.samples[0];
		expect(bip).toBeDefined();
		expect(bop).toBeDefined();
		expect(bip?.timestamp).toBe(0);
		expect(bop?.timestamp).toBe(1);

		const bipSamples = bip!.toAudioBuffer().getChannelData(0);
		const bopSamples = bop!.toAudioBuffer().getChannelData(0);
		expect(correlation(bipSamples, 1500, bip!.sampleRate)).toBeGreaterThan(0.2);
		expect(correlation(bipSamples, 475, bip!.sampleRate)).toBeLessThan(0.05);
		expect(correlation(bopSamples, 475, bop!.sampleRate)).toBeGreaterThan(0.2);
		expect(correlation(bopSamples, 1500, bop!.sampleRate)).toBeLessThan(0.05);

		for (const sample of [...even.samples, ...odd.samples]) sample.close();
	});
});

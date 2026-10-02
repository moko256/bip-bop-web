import { describe, expect, it } from 'vitest';
import { VideoGeneration, type GeneratePlayback } from './VideoGeneration.svelte';

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

describe('VideoGeneration', () => {
	it('passes the current signal to generate and clears playback on cancel', async () => {
		const pending = deferred<string>();
		const signals: AbortSignal[] = [];
		const generate: GeneratePlayback = (options) => {
			signals.push(options.signal);
			return pending.promise;
		};
		const generation = new VideoGeneration(generate);

		generation.start({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			resolution: '1920x1080'
		});

		expect(generation.playback).toBe(pending.promise);
		expect(signals).toHaveLength(1);

		generation.cancel();

		expect(signals[0]?.aborted).toBe(true);
		expect(generation.playback).toBeNull();
	});

	it('uses a fresh signal after cancel', () => {
		const signals: AbortSignal[] = [];
		const generate: GeneratePlayback = (options) => {
			signals.push(options.signal);
			return Promise.resolve('blob:video');
		};
		const generation = new VideoGeneration(generate);
		const request = {
			outputType: 'webm' as const,
			videoCodec: 'vp9' as const,
			audioCodec: 'opus' as const,
			resolution: '720x480' as const
		};

		generation.start(request);
		generation.cancel();
		generation.start(request);

		expect(signals[0]?.aborted).toBe(true);
		expect(signals[1]?.aborted).toBe(false);
		expect(signals[0]).not.toBe(signals[1]);
		expect(generation.playback).not.toBeNull();
	});

	it('aborts on dispose', () => {
		let signal: AbortSignal | undefined;
		const generation = new VideoGeneration((options) => {
			signal = options.signal;
			return Promise.resolve('blob:video');
		});
		generation.start({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			resolution: '1920x1080'
		});

		generation.dispose();

		expect(signal?.aborted).toBe(true);
	});

	it('keeps the latest default audio codec when the OutputType changes', async () => {
		let releaseFirst: (codec: AudioCodec | null) => void = () => {};
		const first = new Promise<AudioCodec | null>((resolve) => {
			releaseFirst = resolve;
		});
		const generation = new VideoGeneration(
			() => Promise.resolve('blob:video'),
			(type) => (type === 'mp4' ? first : Promise.resolve('opus'))
		);
		const pendingFirst = generation.loadDefaultAudioCodec('mp4');
		await generation.loadDefaultAudioCodec('webm');
		releaseFirst('aac');
		await pendingFirst;

		expect(generation.defaultAudioCodec).toBe('opus');
	});
});

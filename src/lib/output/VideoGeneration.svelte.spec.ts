import type { AudioCodec } from 'mediabunny';
import { describe, expect, it, vi } from 'vitest';
import {
	VideoGeneration,
	type GeneratePlayback,
	type VideoGenerationRequest
} from './VideoGeneration.svelte';

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const request: VideoGenerationRequest = {
	outputType: 'mp4',
	videoCodec: 'avc',
	audioCodec: 'aac',
	resolution: '1920x1080',
	frameCount: 3600,
	fps: 60,
	videoQuality: 'high'
};

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
			resolution: '1920x1080',
			frameCount: 3600,
			fps: 60,
			videoQuality: 'high'
		});

		expect(generation.playback).not.toBeNull();
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
			resolution: '640x480' as const,
			frameCount: 3600,
			fps: 60,
			videoQuality: 'high' as const
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
			resolution: '1920x1080',
			frameCount: 3600,
			fps: 60,
			videoQuality: 'high'
		});

		generation.dispose();

		expect(signal?.aborted).toBe(true);
	});

	it('revokes the playback URL when a later start, cancel, or dispose drops it', async () => {
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const signals: AbortSignal[] = [];
		const generation = new VideoGeneration((options) => {
			signals.push(options.signal);
			return Promise.resolve(`blob:${signals.length}`);
		});

		try {
			generation.start(request);
			await generation.playback;
			generation.start(request);
			expect(signals[0]?.aborted).toBe(true);
			expect(revoke).toHaveBeenCalledWith('blob:1');

			await generation.playback;
			generation.cancel();
			expect(revoke).toHaveBeenCalledWith('blob:2');
			expect(generation.playback).toBeNull();

			generation.start(request);
			await generation.playback;
			generation.dispose();
			expect(revoke).toHaveBeenCalledWith('blob:3');
		} finally {
			revoke.mockRestore();
		}
	});

	it('revokes a URL that resolves after the generation was dropped', async () => {
		const pending = deferred<string>();
		const revoke = vi.spyOn(URL, 'revokeObjectURL');
		const generation = new VideoGeneration(() => pending.promise);

		try {
			generation.start(request);
			generation.cancel();
			pending.resolve('blob:late');
			await pending.promise;
			await Promise.resolve();

			expect(revoke).toHaveBeenCalledWith('blob:late');
			expect(generation.playback).toBeNull();
		} finally {
			revoke.mockRestore();
		}
	});

	it('records written frames until the generation is dropped', () => {
		let report: (completedFrames: number) => void = () => {};
		const generation = new VideoGeneration((options) => {
			report = options.onProgress;
			return new Promise(() => {});
		});

		generation.start(request);
		expect(generation.completedFrames).toBe(0);
		expect(generation.totalFrames).toBe(3600);

		report(12);
		expect(generation.completedFrames).toBe(12);

		generation.cancel();
		expect(generation.completedFrames).toBe(0);
		expect(generation.totalFrames).toBe(0);

		report(13);
		expect(generation.completedFrames).toBe(0);
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

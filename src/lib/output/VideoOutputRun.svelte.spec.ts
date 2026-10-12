import type { AudioCodec, VideoCodec } from 'mediabunny';
import type { VideoOutputType } from './output';
import { describe, expect, it, vi } from 'vitest';
import { EncodableCodecLists } from './EncodableCodecLists.svelte';
import type { GenerateVideoUrl } from './VideoGeneration.svelte';
import { VideoOutputRun } from './VideoOutputRun.svelte';

function createRun(generate: GenerateVideoUrl = () => Promise.resolve('blob:video')) {
	let outputType: VideoOutputType = 'mp4';
	const run = new VideoOutputRun({
		outputType: () => outputType,
		generate,
		canEncode: () => Promise.resolve(true),
		audioCodec: async () => 'aac'
	});
	return {
		run,
		setOutputType(type: VideoOutputType) {
			outputType = type;
		}
	};
}

describe('VideoOutputRun', () => {
	it('keeps the typed frame count across fps changes and drops an in-flight video', () => {
		const { run } = createRun();

		run.submit();
		run.session.seek(30);
		expect(run.generation.videoUrl).not.toBeNull();

		run.setFrameCountText('1000', 1000);

		expect(run.frameCountText).toBe('1000');
		expect(run.generation.videoUrl).toBeNull();
		expect(run.session.frame).toBe(0);

		run.setFpsText('23.976', 23.976);
		expect(run.frameCountText).toBe('400');

		run.setFpsText('0', null);
		expect(run.fpsText).toBe('0');
		expect(run.frameCountText).toBe('400');

		run.setFpsText('60', 60);
		expect(run.frameCountText).toBe('1000');
	});

	it('starts a video at the entered length and refuses a selection that cannot be encoded', async () => {
		const generate = vi.fn<GenerateVideoUrl>(() => Promise.resolve('blob:video'));
		const { run } = createRun(generate);
		run.setFrameCountText('1000', 1000);

		run.submit();

		expect(generate).toHaveBeenCalledWith({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			resolution: '1920x1080',
			frameCount: 1000,
			fps: 60,
			videoQuality: 'high',
			signal: expect.any(AbortSignal),
			onProgress: expect.any(Function)
		});
		expect(run.session.fps).toBe(60);
		expect(run.session.maxFrame).toBe(1000);
		expect(run.downloadName).toBe('bip-bop_1920x1080_60fps_1000_avc_aac_high.mp4');
	});

	it('does not start when the selection cannot be encoded', async () => {
		const generate = vi.fn<GenerateVideoUrl>(() => Promise.resolve('blob:video'));
		const run = new VideoOutputRun({
			outputType: () => 'mp4',
			generate,
			canEncode: () => Promise.resolve(false),
			audioCodec: async () => 'aac'
		});

		await vi.waitFor(() => {
			expect(run.encodeCheck.checking).toBe(false);
			expect(run.encodeCheck.encodable).toBe(false);
		});
		run.submit();

		expect(generate).not.toHaveBeenCalled();
		expect(run.downloadName).toBeNull();
	});

	it('drops the video and the playback position when the OutputType changes', () => {
		const { run, setOutputType } = createRun();
		run.noteOutputType();
		run.submit();
		run.session.seek(12);

		run.noteOutputType();

		expect(run.generation.videoUrl).not.toBeNull();
		expect(run.session.frame).toBe(12);

		setOutputType('webm');
		run.noteOutputType();

		expect(run.generation.videoUrl).toBeNull();
		expect(run.session.frame).toBe(0);
		expect(run.downloadName).toBeNull();
	});

	it('reuses encodable codecs when the OutputType returns', async () => {
		const pending = {
			webm: {
				video: deferred<VideoCodec[]>(),
				audio: deferred<AudioCodec[]>()
			},
			mp4: {
				video: deferred<VideoCodec[]>(),
				audio: deferred<AudioCodec[]>()
			}
		};
		const calls: string[] = [];
		const codecLists = new EncodableCodecLists(
			(type) => {
				calls.push(`video:${type}`);
				return pending[type].video.promise;
			},
			(type) => {
				calls.push(`audio:${type}`);
				return pending[type].audio.promise;
			}
		);
		let outputType: VideoOutputType = 'webm';
		const run = new VideoOutputRun({
			outputType: () => outputType,
			generate: () => Promise.resolve('blob:video'),
			canEncode: () => Promise.resolve(true),
			audioCodec: async () => 'opus',
			codecLists
		});

		expect(run.codecsLoading).toBe(true);
		expect(run.videoCodecs).toEqual([]);
		expect(run.audioCodecs).toEqual([]);
		expect(run.videoCodec).toBe('av1');

		pending.webm.video.resolve(['vp9', 'vp8']);
		pending.webm.audio.resolve(['opus', 'vorbis']);
		await vi.waitFor(() => {
			expect(run.codecsLoading).toBe(false);
		});
		expect(run.videoCodecs).toEqual(['vp9', 'vp8']);
		expect(run.audioCodecs).toEqual(['opus', 'vorbis']);
		expect(run.videoCodec).toBe('vp9');
		run.chooseVideoCodec('vp8');

		outputType = 'mp4';
		run.noteOutputType();

		expect(run.codecsLoading).toBe(true);
		expect(run.videoCodecs).toEqual([]);
		expect(run.videoCodec).toBe('vp8');

		outputType = 'webm';
		run.noteOutputType();

		expect(run.codecsLoading).toBe(false);
		expect(run.videoCodecs).toEqual(['vp9', 'vp8']);
		expect(run.videoCodec).toBe('vp8');
		expect(calls).toEqual(['video:webm', 'audio:webm', 'video:mp4', 'audio:mp4']);

		run.dispose();
		const again = new VideoOutputRun({
			outputType: () => 'webm' as const,
			generate: () => Promise.resolve('blob:video'),
			canEncode: () => Promise.resolve(true),
			audioCodec: async () => 'opus',
			codecLists
		});
		expect(again.codecsLoading).toBe(false);
		expect(again.videoCodecs).toEqual(['vp9', 'vp8']);
		expect(calls).toEqual(['video:webm', 'audio:webm', 'video:mp4', 'audio:mp4']);
		again.dispose();
	});
});

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

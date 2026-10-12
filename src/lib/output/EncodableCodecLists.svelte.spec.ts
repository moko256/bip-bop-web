import type { AudioCodec, VideoCodec } from 'mediabunny';
import { describe, expect, it, vi } from 'vitest';
import { EncodableCodecLists } from './EncodableCodecLists.svelte';
import type { VideoOutputType } from './output';

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: unknown) => void = () => {};
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('EncodableCodecLists', () => {
	it('checks each OutputType once and reuses the list', async () => {
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
		const lists = new EncodableCodecLists(
			(type) => {
				calls.push(`video:${type}`);
				return pending[type].video.promise;
			},
			(type) => {
				calls.push(`audio:${type}`);
				return pending[type].audio.promise;
			}
		);

		expect(lists.loading('webm')).toBe(true);
		expect(lists.videoCodecs('webm')).toEqual([]);
		expect(lists.audioCodecs('webm')).toEqual([]);

		lists.ensure('webm');
		lists.ensure('webm');

		expect(lists.loading('webm')).toBe(true);
		expect(calls).toEqual(['video:webm', 'audio:webm']);

		pending.webm.video.resolve(['vp9', 'vp8']);
		pending.webm.audio.resolve(['opus']);
		await vi.waitFor(() => {
			expect(lists.loading('webm')).toBe(false);
		});
		expect(lists.videoCodecs('webm')).toEqual(['vp9', 'vp8']);
		expect(lists.audioCodecs('webm')).toEqual(['opus']);
		expect(lists.loading('mp4')).toBe(true);

		lists.ensure('mp4');
		lists.ensure('webm');
		lists.ensure('mp4');

		expect(lists.loading('mp4')).toBe(true);
		expect(lists.videoCodecs('webm')).toEqual(['vp9', 'vp8']);
		expect(calls).toEqual(['video:webm', 'audio:webm', 'video:mp4', 'audio:mp4']);

		pending.mp4.video.resolve(['avc']);
		pending.mp4.audio.resolve(['aac']);
		await vi.waitFor(() => {
			expect(lists.loading('mp4')).toBe(false);
		});
		expect(lists.videoCodecs('mp4')).toEqual(['avc']);
		expect(lists.audioCodecs('mp4')).toEqual(['aac']);
		lists.ensure('webm');
		lists.ensure('mp4');
		expect(calls).toEqual(['video:webm', 'audio:webm', 'video:mp4', 'audio:mp4']);
	});

	it('finishes with an empty list when a check fails and does not retry', async () => {
		const calls: VideoOutputType[] = [];
		const lists = new EncodableCodecLists(
			(type) => {
				calls.push(type);
				return Promise.reject(new Error('encoder missing'));
			},
			() => Promise.reject(new Error('encoder missing'))
		);

		lists.ensure('mp4');
		await vi.waitFor(() => {
			expect(lists.loading('mp4')).toBe(false);
		});
		expect(lists.videoCodecs('mp4')).toEqual([]);
		expect(lists.audioCodecs('mp4')).toEqual([]);

		lists.ensure('mp4');
		expect(calls).toEqual(['mp4']);
	});
});

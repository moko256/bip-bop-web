import * as m from '#lib/paraglide/messages.js';
import { describe, expect, it } from 'vitest';
import { VideoGenerationError } from './generate-video';
import { videoGenerationMessage } from './video-generation-message';

describe('videoGenerationMessage', () => {
	it('labels a container that cannot hold the audio codec', () => {
		expect(
			videoGenerationMessage(new VideoGenerationError('audio-codec-unavailable-in-container'))
		).toBe(m.error_audio_codec_unavailable_in_container());
	});

	it('labels an audio codec this browser cannot encode', () => {
		expect(videoGenerationMessage(new VideoGenerationError('audio-codec-cannot-encode'))).toBe(
			m.error_audio_codec_cannot_encode()
		);
	});

	it('labels a video that finished without bytes', () => {
		expect(videoGenerationMessage(new VideoGenerationError('video-generation-failed'))).toBe(
			m.error_video_generation_failed()
		);
	});

	it('labels an abort', () => {
		expect(
			videoGenerationMessage(new DOMException('The operation was aborted.', 'AbortError'))
		).toBe(m.error_video_generation_aborted());
	});

	it('keeps an unexpected error message', () => {
		expect(videoGenerationMessage(new Error('encoder stopped'))).toBe('encoder stopped');
	});

	it('uses the generic failure when there is no message', () => {
		expect(videoGenerationMessage(undefined)).toBe(m.error_video_generation_failed());
	});
});

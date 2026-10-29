import * as m from '#lib/paraglide/messages.js';
import { VideoGenerationError, type VideoGenerationFailure } from './generate-video';

/** Copy for a failed video OutputType. Codes stay on the error; this is the label. */
export function videoGenerationMessage(error: unknown): string {
	if (error instanceof VideoGenerationError) return failureMessage(error.failure);
	if (error instanceof DOMException && error.name === 'AbortError') {
		return m.error_video_generation_aborted();
	}
	if (error instanceof Error && error.message !== '') return error.message;
	return m.error_video_generation_failed();
}

function failureMessage(failure: VideoGenerationFailure): string {
	switch (failure) {
		case 'audio-codec-unavailable-in-container':
			return m.error_audio_codec_unavailable_in_container();
		case 'audio-codec-cannot-encode':
			return m.error_audio_codec_cannot_encode();
		case 'video-generation-failed':
			return m.error_video_generation_failed();
		default: {
			const unreachable: never = failure;
			return unreachable;
		}
	}
}

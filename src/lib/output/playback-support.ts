import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import {
	canDecodeAudio,
	canDecodeVideo,
	canEncodeVideo,
	Quality,
	type AudioCodec,
	type VideoCodec
} from 'mediabunny';
import type { VideoQualityLevel } from './video-quality';

export type PlaybackSelection = {
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	videoQuality: VideoQualityLevel;
};

export type CanPlaySelection = (selection: PlaybackSelection) => Promise<boolean>;

/**
 * Whether this browser can play a video made with the selected codecs and quality.
 * Decode support is playback. The selected quality has to be encodable to produce that video.
 */
export async function canPlaySelection(selection: PlaybackSelection): Promise<boolean> {
	const [videoPlayable, audioPlayable, qualityEncodable] = await Promise.all([
		canDecodeVideo(selection.videoCodec),
		canDecodeAudio(selection.audioCodec, {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE
		}),
		canEncodeVideo(selection.videoCodec, {
			quality: new Quality(selection.videoQuality)
		})
	]);
	return videoPlayable && audioPlayable && qualityEncodable;
}

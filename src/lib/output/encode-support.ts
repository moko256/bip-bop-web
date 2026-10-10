import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import {
	canEncodeAudio,
	canEncodeVideo,
	Quality,
	type AudioCodec,
	type VideoCodec
} from 'mediabunny';
import type { VideoQualityLevel } from './video-quality';

export type EncodeSelection = {
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	videoQuality: VideoQualityLevel;
};

export type CanEncodeSelection = (selection: EncodeSelection) => Promise<boolean>;

/** Whether this browser can encode the selected video quality and audio codec. */
export async function canEncodeSelection(selection: EncodeSelection): Promise<boolean> {
	const [videoEncodable, audioEncodable] = await Promise.all([
		canEncodeVideo(selection.videoCodec, {
			quality: new Quality(selection.videoQuality)
		}),
		canEncodeAudio(selection.audioCodec, {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
			quality: new Quality('high')
		})
	]);
	return videoEncodable && audioEncodable;
}

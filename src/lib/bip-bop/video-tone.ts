import { AudioSample, AudioSampleSource } from 'mediabunny';
import {
	BIP_BOP_AUDIO_SAMPLE_RATE,
	BipBopAudioRenderer,
	bipBopFrequencyHz,
	bipBopToneFrameCount
} from './audio';

/**
 * Silence before the Timeline, in frames at {@link BIP_BOP_AUDIO_SAMPLE_RATE}.
 * 100ms: longer than the priming a lossy encoder needs before its first frame.
 */
export const BIP_BOP_PRIMING_FRAMES = 4800;

/**
 * Silence that ends where the Timeline begins, placed before the first tone.
 * A tone on the first sample of an encoded stream fades in while the codec
 * settles, so the encoder is fed this stretch first and the burst onset lands
 * inside the stream, like every later second's. Its timestamp is negative:
 * the container presents the track from the end of this sample, so the first
 * tone still sounds at the start of the video. Only a container with that
 * presentation trim (MP4's edit list) may use it, and only for a codec with
 * no starting trim of its own. Opus carries its pre-skip in-band, so an MP4
 * Opus track and every WebM track skip this.
 */
export function needsBipBopPriming(outputType: string, audioCodec: string): boolean {
	return (
		outputType === 'mp4' &&
		(audioCodec === 'aac' || audioCodec === 'mp3' || audioCodec === 'vorbis')
	);
}

/** Places {@link BIP_BOP_PRIMING_FRAMES} of silence ending at the Timeline start. */
export async function placeBipBopPriming(source: AudioSampleSource): Promise<void> {
	const sample = new AudioSample({
		data: new Float32Array(BIP_BOP_PRIMING_FRAMES),
		format: 'f32-planar',
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
		numberOfChannels: 1,
		numberOfFrames: BIP_BOP_PRIMING_FRAMES,
		timestamp: -BIP_BOP_PRIMING_FRAMES / BIP_BOP_AUDIO_SAMPLE_RATE
	});
	try {
		await source.add(sample);
	} finally {
		sample.close();
	}
}

/** One Bip or Bop burst placed on `second` of an exported video. */
export async function placeBipBopTone(source: AudioSampleSource, second: number): Promise<void> {
	const frequencyHz = bipBopFrequencyHz(second);
	const length = bipBopToneFrameCount(BIP_BOP_AUDIO_SAMPLE_RATE, frequencyHz);
	const context = new OfflineAudioContext(1, length, BIP_BOP_AUDIO_SAMPLE_RATE);
	BipBopAudioRenderer(context, 0, frequencyHz);
	const buffer = await context.startRendering();
	const samples = AudioSample.fromAudioBuffer(buffer, second);
	for (const sample of samples) {
		try {
			await source.add(sample);
		} finally {
			sample.close();
		}
	}
}

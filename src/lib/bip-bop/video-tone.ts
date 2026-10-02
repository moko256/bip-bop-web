import { AudioSample, AudioSampleSource } from 'mediabunny';
import {
	BIP_BOP_AUDIO_SAMPLE_RATE,
	BipBopAudioRenderer,
	bipBopFrequencyHz,
	bipBopToneFrameCount
} from './audio';

/** One Bip or Bop burst placed on `second` of an exported video. */
export async function placeBipBopTone(source: AudioSampleSource, second: number): Promise<void> {
	const length = bipBopToneFrameCount(BIP_BOP_AUDIO_SAMPLE_RATE);
	const context = new OfflineAudioContext(1, length, BIP_BOP_AUDIO_SAMPLE_RATE);
	BipBopAudioRenderer(context, 0, bipBopFrequencyHz(second));
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

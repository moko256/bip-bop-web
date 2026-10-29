import { AudioSample, AudioSampleSource } from 'mediabunny';
import {
	BIP_BOP_AUDIO_SAMPLE_RATE,
	BipBopAudioRenderer,
	bipBopFrequencyHz,
	bipBopToneFrameCount
} from './audio';

/**
 * One Bip or Bop burst placed on `second` of an exported video.
 * mediabunny compensates each encoder's priming delay itself (and feeds
 * WebKit's AAC encoder a silent prefix so it cannot discard the opening
 * samples), so the first burst can start on the first sample: no leading
 * silence is placed here.
 */
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

import { describe, expect, it } from 'vitest';
import { preferredAudioCodec } from './generate-video';
import { canPlaySelection } from './playback-support';

describe('canPlaySelection', () => {
	it('can play the default mp4 codec and quality in this browser', async () => {
		const audioCodec = await preferredAudioCodec('mp4');
		expect(audioCodec).not.toBeNull();
		if (!audioCodec) return;

		await expect(
			canPlaySelection({ videoCodec: 'avc', audioCodec, videoQuality: 'high' })
		).resolves.toBe(true);
	});
});

import { describe, expect, it } from 'vitest';
import { canEncodeSelection } from './encode-support';
import { preferredAudioCodec } from './generate-video';

describe('canEncodeSelection', () => {
	it('can encode the default mp4 codec and quality in this browser', async () => {
		const audioCodec = await preferredAudioCodec('mp4');
		expect(audioCodec).not.toBeNull();
		if (!audioCodec) return;

		await expect(
			canEncodeSelection({ videoCodec: 'avc', audioCodec, videoQuality: 'high' })
		).resolves.toBe(true);
	});
});

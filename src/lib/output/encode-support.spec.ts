import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { Quality, canEncodeAudio, canEncodeVideo } from 'mediabunny';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canEncodeSelection } from './encode-support';

vi.mock('mediabunny', async (importOriginal) => {
	const actual = await importOriginal<typeof import('mediabunny')>();
	return {
		...actual,
		canEncodeVideo: vi.fn(),
		canEncodeAudio: vi.fn()
	};
});

describe('canEncodeSelection', () => {
	beforeEach(() => {
		vi.mocked(canEncodeVideo).mockReset();
		vi.mocked(canEncodeAudio).mockReset();
		vi.mocked(canEncodeVideo).mockResolvedValue(true);
		vi.mocked(canEncodeAudio).mockResolvedValue(true);
	});

	it('asks mediabunny whether the video quality and audio codec can be encoded', async () => {
		await expect(
			canEncodeSelection({ videoCodec: 'vp9', audioCodec: 'opus', videoQuality: 'low' })
		).resolves.toBe(true);

		expect(canEncodeVideo).toHaveBeenCalledWith('vp9', { quality: expect.any(Quality) });
		expect(canEncodeAudio).toHaveBeenCalledWith('opus', {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
			quality: expect.any(Quality)
		});
	});

	it('is not encodable when the video codec and quality cannot be encoded', async () => {
		vi.mocked(canEncodeVideo).mockResolvedValue(false);

		await expect(
			canEncodeSelection({ videoCodec: 'hevc', audioCodec: 'aac', videoQuality: 'high' })
		).resolves.toBe(false);
	});

	it('is not encodable when the audio codec cannot be encoded', async () => {
		vi.mocked(canEncodeAudio).mockResolvedValue(false);

		await expect(
			canEncodeSelection({ videoCodec: 'avc', audioCodec: 'aac', videoQuality: 'high' })
		).resolves.toBe(false);
	});
});

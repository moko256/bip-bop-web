import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { Quality, canDecodeAudio, canDecodeVideo, canEncodeVideo } from 'mediabunny';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canPlaySelection } from './playback-support';

vi.mock('mediabunny', async (importOriginal) => {
	const actual = await importOriginal<typeof import('mediabunny')>();
	return {
		...actual,
		canDecodeVideo: vi.fn(),
		canDecodeAudio: vi.fn(),
		canEncodeVideo: vi.fn()
	};
});

describe('canPlaySelection', () => {
	beforeEach(() => {
		vi.mocked(canDecodeVideo).mockReset();
		vi.mocked(canDecodeAudio).mockReset();
		vi.mocked(canEncodeVideo).mockReset();
		vi.mocked(canDecodeVideo).mockResolvedValue(true);
		vi.mocked(canDecodeAudio).mockResolvedValue(true);
		vi.mocked(canEncodeVideo).mockResolvedValue(true);
	});

	it('asks mediabunny whether the codecs can be decoded and the quality encoded', async () => {
		await expect(
			canPlaySelection({ videoCodec: 'vp9', audioCodec: 'opus', videoQuality: 'low' })
		).resolves.toBe(true);

		expect(canDecodeVideo).toHaveBeenCalledWith('vp9');
		expect(canDecodeAudio).toHaveBeenCalledWith('opus', {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE
		});
		expect(canEncodeVideo).toHaveBeenCalledWith('vp9', { quality: expect.any(Quality) });
	});

	it('is not playable when the video codec cannot be decoded', async () => {
		vi.mocked(canDecodeVideo).mockResolvedValue(false);

		await expect(
			canPlaySelection({ videoCodec: 'hevc', audioCodec: 'aac', videoQuality: 'high' })
		).resolves.toBe(false);
	});

	it('is not playable when the audio codec cannot be decoded', async () => {
		vi.mocked(canDecodeAudio).mockResolvedValue(false);

		await expect(
			canPlaySelection({ videoCodec: 'avc', audioCodec: 'aac', videoQuality: 'high' })
		).resolves.toBe(false);
	});

	it('is not playable when the video quality cannot be encoded', async () => {
		vi.mocked(canEncodeVideo).mockResolvedValue(false);

		await expect(
			canPlaySelection({ videoCodec: 'avc', audioCodec: 'aac', videoQuality: 'very-high' })
		).resolves.toBe(false);
	});
});

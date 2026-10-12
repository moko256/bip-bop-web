import { describe, expect, it } from 'vitest';
import { generateBipBopVideo, VideoGenerationError } from './generate-video';

describe('generateBipBopVideo', () => {
	it('rejects an audio codec the container cannot hold', async () => {
		await expect(
			generateBipBopVideo({
				outputType: 'webm',
				videoCodec: 'vp9',
				audioCodec: 'aac',
				width: 64,
				height: 64,
				frameCount: 1
			})
		).rejects.toSatisfy(
			(error: unknown) =>
				error instanceof VideoGenerationError &&
				error.failure === 'audio-codec-unavailable-in-container'
		);
	});
});

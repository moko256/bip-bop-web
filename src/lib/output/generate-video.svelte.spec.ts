import { describe, expect, it } from 'vitest';
import { generateBipBopVideo } from './generate-video';

describe('generateBipBopVideo', () => {
	it('writes an mp4 blob with the format mime type', async () => {
		const blob = await generateBipBopVideo({
			outputType: 'mp4',
			codec: 'avc',
			width: 64,
			height: 64,
			frameCount: 2
		});

		expect(blob.type).toBe('video/mp4');
		expect(blob.size).toBeGreaterThan(0);
	});

	it('writes a webm blob with the format mime type', async () => {
		const blob = await generateBipBopVideo({
			outputType: 'webm',
			codec: 'vp9',
			width: 64,
			height: 64,
			frameCount: 2
		});

		expect(blob.type).toBe('video/webm');
		expect(blob.size).toBeGreaterThan(0);
	});

	it('stops when the caller aborts', async () => {
		const abort = new AbortController();
		abort.abort();

		await expect(
			generateBipBopVideo({
				outputType: 'mp4',
				codec: 'avc',
				width: 64,
				height: 64,
				frameCount: 30,
				signal: abort.signal
			})
		).rejects.toSatisfy(
			(error: unknown) => error instanceof DOMException && error.name === 'AbortError'
		);
	});
});

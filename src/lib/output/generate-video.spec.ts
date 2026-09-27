import { describe, expect, it } from 'vitest';
import { VIDEO_DURATION_SECONDS, VIDEO_FPS } from './generate-video';

describe('video duration', () => {
	it('encodes 10 seconds at 60 fps', () => {
		expect(VIDEO_FPS).toBe(60);
		expect(VIDEO_DURATION_SECONDS).toBe(10);
		expect(VIDEO_FPS * VIDEO_DURATION_SECONDS).toBe(600);
	});
});

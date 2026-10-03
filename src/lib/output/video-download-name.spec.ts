import { describe, expect, it } from 'vitest';
import { videoDownloadName } from './video-download-name';

describe('videoDownloadName', () => {
	it('writes the rate with a hyphen in place of a decimal point', () => {
		expect(
			videoDownloadName({
				width: 1920,
				height: 1080,
				fps: 59.94,
				frameCount: 3596,
				videoCodec: 'avc',
				audioCodec: 'aac',
				videoQuality: 'very-high',
				extension: 'webm'
			})
		).toBe('bip-bop_1920x1080_59-94fps_3596_avc_aac_very-high.webm');
	});

	it('keeps an integer rate free of a hyphen', () => {
		expect(
			videoDownloadName({
				width: 1280,
				height: 720,
				fps: 60,
				frameCount: 3600,
				videoCodec: 'vp9',
				audioCodec: 'opus',
				videoQuality: 'high',
				extension: 'mp4'
			})
		).toBe('bip-bop_1280x720_60fps_3600_vp9_opus_high.mp4');
	});
});

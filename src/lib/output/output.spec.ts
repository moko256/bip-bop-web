import { describe, expect, it } from 'vitest';
import {
	defaultResolution,
	isVideoOutputType,
	outputCategory,
	parseResolution,
	resolutionCatalog,
	resolutionGroups
} from './output';
import { supportedAudioCodecs, supportedVideoCodecs, videoOutputFormat } from './video-container';

describe('outputCategory', () => {
	it('keeps page as page', () => {
		expect(outputCategory('page')).toBe('page');
	});

	it('groups mp4 and webm as video', () => {
		expect(outputCategory('mp4')).toBe('video');
		expect(outputCategory('webm')).toBe('video');
	});

	it('keeps a fullscreen url as a fullscreen url', () => {
		expect(outputCategory('fullscreen-url')).toBe('fullscreen-url');
	});
});

describe('videoOutputFormat', () => {
	it('derives a mime type from the video OutputType', () => {
		expect(isVideoOutputType('mp4')).toBe(true);
		expect(isVideoOutputType('page')).toBe(false);
		expect(videoOutputFormat('mp4').mimeType).toBe('video/mp4');
		expect(videoOutputFormat('webm').mimeType).toBe('video/webm');
	});

	it('lists the video codecs the format can contain', () => {
		expect(supportedVideoCodecs('mp4')).toEqual(['avc', 'hevc', 'av1', 'vp9', 'vp8', 'prores']);
		expect(supportedVideoCodecs('webm')).toEqual(['av1', 'vp9', 'vp8']);
	});

	it('lists the audio codecs the format can contain', () => {
		expect(supportedAudioCodecs('mp4')).toEqual([
			'aac',
			'mp3',
			'opus',
			'vorbis',
			'flac',
			'ac3',
			'eac3',
			'dts',
			'pcm-s16',
			'pcm-s16be',
			'pcm-s24',
			'pcm-s24be',
			'pcm-s32',
			'pcm-s32be',
			'pcm-f32',
			'pcm-f32be',
			'pcm-f64',
			'pcm-f64be'
		]);
		expect(supportedAudioCodecs('webm')).toEqual(['opus', 'vorbis']);
	});
});

describe('parseResolution', () => {
	it('reads the selected pixel size', () => {
		expect(parseResolution('1920x1080')).toEqual({ width: 1920, height: 1080 });
		expect(parseResolution('640x480')).toEqual({ width: 640, height: 480 });
	});

	it('rejects values that are not in the catalog', () => {
		expect(() => parseResolution('720x480' as '1920x1080')).toThrow();
	});
});

describe('resolutionGroups', () => {
	it('defaults to full HD', () => {
		expect(defaultResolution).toBe('1920x1080');
	});

	it('orders aspect-ratio groups from 16:9 toward 4:3, then wider than 16:9', () => {
		const ratios = resolutionGroups.map((group) => {
			const [width, height] = group.label.split(':').map(Number);
			return width / height;
		});
		const sixteenByNine = 16 / 9;
		const firstWiderIndex = ratios.findIndex((ratio) => ratio > sixteenByNine);
		expect(firstWiderIndex).toBeGreaterThan(0);
		expect(ratios.indexOf(sixteenByNine)).toBeLessThan(ratios.indexOf(16 / 10));
		expect(ratios.indexOf(16 / 10)).toBeLessThan(ratios.indexOf(4 / 3));
		const upToSixteenByNine = ratios.slice(0, firstWiderIndex);
		expect(upToSixteenByNine).toEqual([...upToSixteenByNine].sort((a, b) => b - a));
		const widerGroups = ratios.slice(firstWiderIndex);
		expect(widerGroups).toEqual([...widerGroups].sort((a, b) => b - a));
		for (const ratio of upToSixteenByNine) {
			expect(ratio).toBeLessThanOrEqual(sixteenByNine + 1e-9);
		}
		for (const ratio of widerGroups) {
			expect(ratio).toBeGreaterThan(sixteenByNine);
		}
	});

	it('lists the highest pixel count first within each group', () => {
		for (const group of resolutionGroups) {
			const pixels = group.options.map(
				(option) => parseResolution(option.value).width * parseResolution(option.value).height
			);
			expect(pixels).toEqual([...pixels].sort((a, b) => b - a));
		}
	});

	it('lists the flat catalog in grouped-select order', () => {
		const fromGroups = resolutionGroups.flatMap((group) =>
			group.options.map((option) => option.value)
		);
		expect(resolutionCatalog.map((entry) => entry.value)).toEqual(fromGroups);
	});

	it('uses precomputed aspect ratio labels for optgroups', () => {
		const sixteenByNine = resolutionGroups.find((group) => group.label === '16:9');
		expect(sixteenByNine?.options.map((option) => option.value)).toContain('1920x1080');
		expect(resolutionGroups.find((group) => group.label === '8:5')).toBeDefined();
		expect(resolutionGroups.find((group) => group.label === '64:27')).toBeDefined();
	});
});

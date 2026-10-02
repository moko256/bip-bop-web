import { describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import {
	defaultResolution,
	isVideoOutputType,
	outputCategory,
	parseResolution,
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
		expect(supportedVideoCodecs('mp4')).toEqual(['avc', 'hevc', 'vp9', 'av1', 'vp8', 'prores']);
		expect(supportedVideoCodecs('webm')).toEqual(['vp9', 'av1', 'vp8']);
	});

	it('lists the audio codecs the format can contain', () => {
		expect(supportedAudioCodecs('mp4')).toEqual([
			'aac',
			'opus',
			'mp3',
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

	it('orders aspect groups from 16:9 toward 4:3, then wider than 16:9', () => {
		const labels = resolutionGroups.map((group) => group.label);
		expect(labels.indexOf('16:9')).toBeLessThan(labels.indexOf('16:10'));
		expect(labels.indexOf('16:10')).toBeLessThan(labels.indexOf('4:3'));
		expect(labels.at(-1)).toBe(m.resolution_aspect_ultrawide());
	});

	it('lists the highest pixel count first within each group', () => {
		for (const group of resolutionGroups) {
			const pixels = group.options.map(
				(option) => parseResolution(option.value).width * parseResolution(option.value).height
			);
			expect(pixels).toEqual([...pixels].sort((a, b) => b - a));
		}
	});
});

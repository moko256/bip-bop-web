import { describe, expect, it } from 'vitest';
import { isVideoOutputType, outputCategory, parseResolution } from './output';
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
		expect(parseResolution('720x480')).toEqual({ width: 720, height: 480 });
	});
});

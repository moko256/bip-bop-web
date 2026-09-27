import { describe, expect, it } from 'vitest';
import { outputCategory } from './output';

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

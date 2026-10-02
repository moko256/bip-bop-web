import { describe, expect, it } from 'vitest';
import { clampFrame, formatPlaybackTime } from './time';

describe('formatPlaybackTime', () => {
	it('shows minutes and seconds under one hour', () => {
		expect(formatPlaybackTime(0, 0, 60)).toBe('00:00 / 00:00');
		expect(formatPlaybackTime(0, 600, 60)).toBe('00:00 / 00:10');
		expect(formatPlaybackTime(90, 600, 60)).toBe('00:01 / 00:10');
		expect(formatPlaybackTime(599, 600, 60)).toBe('00:09 / 00:10');
		expect(formatPlaybackTime(600, 600, 60)).toBe('00:10 / 00:10');
	});

	it('shows hours on both sides once either side reaches an hour', () => {
		expect(formatPlaybackTime(0, 216000, 60)).toBe('00:00:00 / 01:00:00');
		expect(formatPlaybackTime(215999, 216000, 60)).toBe('00:59:59 / 01:00:00');
		expect(formatPlaybackTime(216000, 216000, 60)).toBe('01:00:00 / 01:00:00');
	});

	it('treats a missing rate or a negative position as zero', () => {
		expect(formatPlaybackTime(-30, 600, 60)).toBe('00:00 / 00:10');
		expect(formatPlaybackTime(60, 600, 0)).toBe('00:00 / 00:00');
	});
});

describe('clampFrame', () => {
	it('keeps an in-range index and drops a fraction', () => {
		expect(clampFrame(12.9, 600)).toBe(12);
	});

	it('limits the index to the available frames', () => {
		expect(clampFrame(-4, 600)).toBe(0);
		expect(clampFrame(900, 600)).toBe(600);
		expect(clampFrame(Number.NaN, 600)).toBe(0);
	});

	it('leaves the index unbounded when no length is given', () => {
		expect(clampFrame(999999)).toBe(999999);
		expect(clampFrame(12.9)).toBe(12);
		expect(clampFrame(-4)).toBe(0);
		expect(clampFrame(Number.POSITIVE_INFINITY)).toBe(0);
	});
});

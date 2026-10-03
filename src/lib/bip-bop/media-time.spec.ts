import { describe, expect, it } from 'vitest';
import {
	clockCentisecondsAtFrame,
	clockCentisecondsAtMs,
	elapsedSecondsAtFrame,
	toneSecondAtFrame,
	videoPictureAtFrame
} from './media-time';

describe('toneSecondAtFrame', () => {
	it('places a tone on each whole second at 60 fps', () => {
		expect(toneSecondAtFrame(0, 60)).toBe(0);
		expect(toneSecondAtFrame(59, 60)).toBeNull();
		expect(toneSecondAtFrame(60, 60)).toBe(1);
		expect(toneSecondAtFrame(120, 60)).toBe(2);
	});

	it('places a tone on the first frame of each media second', () => {
		expect(toneSecondAtFrame(0, 24)).toBe(0);
		expect(toneSecondAtFrame(23, 24)).toBeNull();
		expect(toneSecondAtFrame(24, 24)).toBe(1);
		expect(toneSecondAtFrame(24, 23.976)).toBe(1);
		expect(toneSecondAtFrame(23, 23.976)).toBeNull();
	});
});

describe('elapsed time at a frame', () => {
	it('divides the frame count by the frame rate', () => {
		expect(elapsedSecondsAtFrame(0, 60)).toBe(0);
		expect(elapsedSecondsAtFrame(90, 60)).toBe(1.5);
		expect(elapsedSecondsAtFrame(12, 24)).toBe(0.5);
		expect(elapsedSecondsAtFrame(24, 23.976)).toBeCloseTo(24 / 23.976);
		expect(elapsedSecondsAtFrame(-5, 60)).toBe(0);
	});

	it('truncates the video clock the same way at 60 fps and at other rates', () => {
		expect(clockCentisecondsAtFrame(1, 60)).toBe(1);
		expect(clockCentisecondsAtFrame(30, 60)).toBe(50);
		expect(clockCentisecondsAtFrame(69, 60)).toBe(115);
		expect(clockCentisecondsAtFrame(60 * 3661 + 30, 60)).toBe(366150);
		expect(clockCentisecondsAtFrame(12, 24)).toBe(50);
		expect(clockCentisecondsAtFrame(24, 24)).toBe(100);
		expect(clockCentisecondsAtFrame(24, 23.976)).toBe(100);
	});

	it('truncates a live clock to centiseconds', () => {
		expect(clockCentisecondsAtMs(0)).toBe(0);
		expect(clockCentisecondsAtMs(16)).toBe(1);
		expect(clockCentisecondsAtMs(1500)).toBe(150);
		expect(clockCentisecondsAtMs(-10)).toBe(0);
	});

	it('keeps a 60 fps video on the frame grid and other rates on elapsed time', () => {
		expect(videoPictureAtFrame(60, 60)).toMatchObject({
			frame: 60,
			elapsedSeconds: 1,
			clockCentiseconds: 100,
			previousElapsedSeconds: 59 / 60,
			frameGrid: true
		});
		expect(videoPictureAtFrame(24, 24).frameGrid).toBe(false);
		expect(videoPictureAtFrame(0, 24).previousElapsedSeconds).toBeUndefined();
	});
});

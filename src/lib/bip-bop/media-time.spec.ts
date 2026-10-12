import { describe, expect, it } from 'vitest';
import { BIP_BOP_FPS } from './frames';
import {
	elapsedCentisecondsAtFrame,
	elapsedCentisecondsAtMs,
	frameAtSeconds,
	previewBeat,
	previewCycleFraction,
	previewShowBeat,
	secondsAtFrame,
	toneSecondAtFrame,
	videoCycleFraction,
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
		expect(secondsAtFrame(0, 60)).toBe(0);
		expect(secondsAtFrame(90, 60)).toBe(1.5);
		expect(secondsAtFrame(12, 24)).toBe(0.5);
		expect(secondsAtFrame(24, 23.976)).toBeCloseTo(24 / 23.976);
		expect(secondsAtFrame(600, BIP_BOP_FPS)).toBe(10);
		expect(secondsAtFrame(-5, 60)).toBe(0);
	});

	it('truncates a partial frame when reading a Timeline position', () => {
		expect(frameAtSeconds(0, 60)).toBe(0);
		expect(frameAtSeconds(16 / 1000, 60)).toBe(0);
		expect(frameAtSeconds(1 / 60, 60)).toBe(1);
		expect(frameAtSeconds(0.999, 60)).toBe(59);
		expect(frameAtSeconds(1, 60)).toBe(60);
		expect(frameAtSeconds(1.016, 60)).toBe(60);
		expect(frameAtSeconds(1.5, 60)).toBe(90);
		expect(frameAtSeconds(2, 60)).toBe(120);
		expect(frameAtSeconds(10.5, 60)).toBe(630);
		expect(frameAtSeconds(0.5, 24)).toBe(12);
		expect(frameAtSeconds(-10, 60)).toBe(0);
		expect(frameAtSeconds(Number.NaN, 60)).toBe(0);
	});

	it('truncates elapsed centiseconds the same way at 60 fps and at other rates', () => {
		expect(elapsedCentisecondsAtFrame(1, 60)).toBe(1);
		expect(elapsedCentisecondsAtFrame(30, 60)).toBe(50);
		expect(elapsedCentisecondsAtFrame(69, 60)).toBe(115);
		expect(elapsedCentisecondsAtFrame(60 * 3661 + 30, 60)).toBe(366150);
		expect(elapsedCentisecondsAtFrame(12, 24)).toBe(50);
		expect(elapsedCentisecondsAtFrame(24, 24)).toBe(100);
		expect(elapsedCentisecondsAtFrame(24, 23.976)).toBe(100);
	});

	it('truncates preview-clock milliseconds to centiseconds', () => {
		expect(elapsedCentisecondsAtMs(0)).toBe(0);
		expect(elapsedCentisecondsAtMs(16)).toBe(1);
		expect(elapsedCentisecondsAtMs(1500)).toBe(150);
		expect(elapsedCentisecondsAtMs(-10)).toBe(0);
	});

	it('takes the video cycle fraction as the share of the current second', () => {
		expect(videoCycleFraction(0, 60)).toBe(0);
		expect(videoCycleFraction(30, 60)).toBe(0.5);
		expect(videoCycleFraction(59, 60)).toBeCloseTo(59 / 60);
		expect(videoCycleFraction(60, 60)).toBe(0);
		expect(videoCycleFraction(12, 24)).toBe(0.5);
		expect(videoCycleFraction(24, 24)).toBe(0);
		expect(videoCycleFraction(24, 23.976)).toBeCloseTo(24 / 23.976 - 1);
		expect(videoCycleFraction(-5, 60)).toBe(0);

		expect(videoPictureAtFrame(60, 60)).toMatchObject({
			frame: 60,
			elapsedCentiseconds: 100,
			cycleFraction: 0,
			beat: 'bop',
			showBeat: true
		});
		expect(videoPictureAtFrame(30, 60)).toMatchObject({
			cycleFraction: 0.5,
			beat: 'bip',
			showBeat: false
		});
		expect(videoPictureAtFrame(0, 24)).toMatchObject({
			cycleFraction: 0,
			beat: 'bip',
			showBeat: true
		});
		expect(videoPictureAtFrame(24, 24)).toMatchObject({
			cycleFraction: 0,
			beat: 'bop',
			showBeat: true
		});
		expect(videoPictureAtFrame(12, 24).cycleFraction).toBe(0.5);
	});
});

describe('preview cycle fraction', () => {
	it('uses the fractional second and draws the label when the fraction wraps', () => {
		expect(previewCycleFraction(0)).toBe(0);
		expect(previewCycleFraction(0.25)).toBeCloseTo(0.25);
		expect(previewCycleFraction(1)).toBe(0);
		expect(previewCycleFraction(1.5)).toBeCloseTo(0.5);
		expect(previewCycleFraction(-1)).toBe(0);

		expect(previewBeat(0)).toBe('bip');
		expect(previewBeat(0.9)).toBe('bip');
		expect(previewBeat(1)).toBe('bop');
		expect(previewBeat(2)).toBe('bip');

		expect(previewShowBeat(0, null)).toBe(true);
		expect(previewShowBeat(0.2, null)).toBe(false);
		expect(previewShowBeat(0.4, 0.2)).toBe(false);
		expect(previewShowBeat(0.01, 0.98)).toBe(true);
		expect(previewShowBeat(0, 0.5)).toBe(true);
	});
});

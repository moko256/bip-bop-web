import { describe, expect, it } from 'vitest';
import { bipBopPreviewPictureMs, planBipBopPreviewCue, planBipBopTone } from './audio';

describe('planBipBopTone', () => {
	it('plays Bip immediately at the start, then waits out the 16ms burst', () => {
		expect(planBipBopTone(0)).toEqual({
			delayMs: 0,
			frequencyHz: 1500,
			waitMs: 16
		});
	});

	it('after a burst, schedules Bop on the next second and wakes when that burst ends', () => {
		expect(planBipBopTone(16)).toEqual({
			delayMs: 984,
			frequencyHz: 475,
			waitMs: 1000
		});
	});

	it('plays Bop on an odd second and Bip on the following even second', () => {
		expect(planBipBopTone(1000)).toEqual({
			delayMs: 0,
			frequencyHz: 475,
			waitMs: 16
		});
		expect(planBipBopTone(1016)).toEqual({
			delayMs: 984,
			frequencyHz: 1500,
			waitMs: 1000
		});
	});

	it('uses the current second when the clock is already on its boundary', () => {
		expect(planBipBopTone(2000).frequencyHz).toBe(1500);
		expect(planBipBopTone(2000).delayMs).toBe(0);
	});
});

describe('planBipBopPreviewCue', () => {
	it('prepares a later burst outputLatency before the picture', () => {
		expect(planBipBopPreviewCue(500, 40, 0)).toEqual({
			delayMs: 460,
			frequencyHz: 475,
			waitMs: 516,
			pictureShiftMs: 0
		});
		expect(bipBopPreviewPictureMs(500, 0, 500)).toBe(500);
		expect(bipBopPreviewPictureMs(540, 0, 500)).toBe(540);
	});

	it('plays the opening burst after the output lead, then starts the picture', () => {
		const cue = planBipBopPreviewCue(0, 40, 0, true);
		expect(cue).toEqual({
			delayMs: 40,
			frequencyHz: 1500,
			waitMs: 16,
			pictureShiftMs: 80
		});
		expect(bipBopPreviewPictureMs(0, cue.pictureShiftMs, 0)).toBe(0);
		expect(bipBopPreviewPictureMs(40, cue.pictureShiftMs, 0)).toBe(0);
		expect(bipBopPreviewPictureMs(80, cue.pictureShiftMs, 0)).toBe(0);
		expect(bipBopPreviewPictureMs(97, cue.pictureShiftMs, 0)).toBe(17);
	});

	it('keeps the next burst one output lead before its second', () => {
		expect(planBipBopPreviewCue(16, 40, 80, false)).toEqual({
			delayMs: 944,
			frequencyHz: 475,
			waitMs: 1000,
			pictureShiftMs: 80
		});
	});

	it('pushes a startup burst that would land inside the output lead', () => {
		const cue = planBipBopPreviewCue(980, 40, 0, true);
		expect(cue).toEqual({
			delayMs: 40,
			frequencyHz: 475,
			waitMs: 36,
			pictureShiftMs: 60
		});
		expect(bipBopPreviewPictureMs(980, cue.pictureShiftMs, 980)).toBe(980);
		expect(bipBopPreviewPictureMs(1020, cue.pictureShiftMs, 980)).toBe(980);
		expect(bipBopPreviewPictureMs(1040, cue.pictureShiftMs, 980)).toBe(980);
		expect(bipBopPreviewPictureMs(1060, cue.pictureShiftMs, 980)).toBe(1000);
	});

	it('does not freeze the picture for a later burst inside the output lead', () => {
		expect(planBipBopPreviewCue(980, 40, 80, false)).toEqual({
			delayMs: 40,
			frequencyHz: 475,
			waitMs: 36,
			pictureShiftMs: 80
		});
	});

	it('ignores a missing output latency', () => {
		expect(planBipBopPreviewCue(0, 0, 0)).toEqual({
			delayMs: 0,
			frequencyHz: 1500,
			waitMs: 16,
			pictureShiftMs: 0
		});
		expect(planBipBopPreviewCue(16, Number.NaN, Number.NaN).delayMs).toBe(984);
	});
});

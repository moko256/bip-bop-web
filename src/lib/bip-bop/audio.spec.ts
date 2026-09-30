import { describe, expect, it } from 'vitest';
import { planBipBopTone } from './audio';

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

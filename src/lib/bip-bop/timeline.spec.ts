import { describe, expect, it } from 'vitest';
import { BIP_BOP_MAX_FRAME, frameAtElapsedMs, frameAtSeconds, secondsAtFrame } from './timeline';

describe('frameAtElapsedMs', () => {
	it('counts 60 frames per second, truncating a partial frame', () => {
		expect(frameAtElapsedMs(0)).toBe(0);
		expect(frameAtElapsedMs(16)).toBe(0);
		expect(frameAtElapsedMs(1000 / 60)).toBe(1);
		expect(frameAtElapsedMs(999)).toBe(59);
		expect(frameAtElapsedMs(1000)).toBe(60);
		expect(frameAtElapsedMs(1016)).toBe(60);
		expect(frameAtElapsedMs(2000)).toBe(120);
		expect(frameAtElapsedMs(-10)).toBe(0);
	});
});

describe('frameAtSeconds', () => {
	it('uses the same truncation as the preview clock and stops at ten seconds', () => {
		expect(frameAtSeconds(0)).toBe(0);
		expect(frameAtSeconds(1.016)).toBe(60);
		expect(frameAtSeconds(1.5)).toBe(90);
		expect(frameAtSeconds(10)).toBe(BIP_BOP_MAX_FRAME);
		expect(frameAtSeconds(10.5)).toBe(600);
		expect(frameAtSeconds(Number.NaN)).toBe(0);
	});
});

describe('secondsAtFrame', () => {
	it('returns the start of that frame', () => {
		expect(secondsAtFrame(0)).toBe(0);
		expect(secondsAtFrame(90)).toBe(1.5);
		expect(secondsAtFrame(600)).toBe(10);
		expect(secondsAtFrame(-5)).toBe(0);
	});
});

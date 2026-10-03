import { describe, expect, it } from 'vitest';
import { toneSecondAtFrame } from './media-time';

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

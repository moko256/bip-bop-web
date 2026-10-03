import { describe, expect, it } from 'vitest';
import { formatFpsFilenameToken, formatFpsNumber, formatFpsOverlay } from './fps-text';

describe('fps text', () => {
	it('prints integers without a decimal point', () => {
		expect(formatFpsNumber(60)).toBe('60');
		expect(formatFpsOverlay(60)).toBe('60 FPS');
		expect(formatFpsFilenameToken(60)).toBe('60');
	});

	it('keeps preset decimals and turns the point into a hyphen in file names', () => {
		expect(formatFpsNumber(59.94)).toBe('59.94');
		expect(formatFpsOverlay(59.94)).toBe('59.94 FPS');
		expect(formatFpsFilenameToken(59.94)).toBe('59-94');
		expect(formatFpsNumber(29.97)).toBe('29.97');
		expect(formatFpsFilenameToken(23.976)).toBe('23-976');
	});
});

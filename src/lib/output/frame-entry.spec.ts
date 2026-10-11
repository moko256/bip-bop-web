import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FPS,
	displayedFrameCount,
	initialFrameEntry,
	maxFrameCountForFps,
	withCurrentFps,
	withEnteredFrameCount
} from './frame-entry';

describe('frame entry', () => {
	it('starts at one minute and 60 fps', () => {
		const entry = initialFrameEntry();

		expect(entry.currentFps).toBe(DEFAULT_FPS);
		expect(displayedFrameCount(entry)).toBe(3600);
		expect(maxFrameCountForFps(60)).toBe(216000);
		expect(maxFrameCountForFps(23.976)).toBe(86313);
	});

	it('keeps the Timeline when fps changes and restores the entered count', () => {
		let entry = initialFrameEntry();

		entry = withCurrentFps(entry, 24);
		expect(displayedFrameCount(entry)).toBe(1440);

		entry = withCurrentFps(entry, 30);
		expect(displayedFrameCount(entry)).toBe(1800);

		entry = withCurrentFps(entry, 60);
		expect(displayedFrameCount(entry)).toBe(3600);
	});

	it('returns to the typed count after a fractional fps without rounding drift', () => {
		let entry = withEnteredFrameCount(initialFrameEntry(), 1000);

		entry = withCurrentFps(entry, 23.976);
		expect(displayedFrameCount(entry)).toBe(Math.round((1000 * 23.976) / 60));

		entry = withCurrentFps(entry, 60);
		expect(displayedFrameCount(entry)).toBe(1000);
	});

	it('does not clamp a rounded count that falls outside one hour', () => {
		let entry = withEnteredFrameCount(initialFrameEntry(), 216000);
		entry = withCurrentFps(entry, 23.976);
		const shown = displayedFrameCount(entry);

		expect(shown).toBe(Math.round((216000 * 23.976) / 60));
		expect(shown).toBeGreaterThan(maxFrameCountForFps(23.976));

		entry = withCurrentFps(entry, 60);
		expect(displayedFrameCount(entry)).toBe(216000);
	});

	it('replaces the baseline only when the typed count differs from the display', () => {
		const entry = initialFrameEntry();
		const same = withEnteredFrameCount(entry, 3600);
		const at24 = withCurrentFps(entry, 24);
		const edited = withEnteredFrameCount(at24, 1500);

		expect(same).toBe(entry);
		expect(displayedFrameCount(edited)).toBe(1500);
		expect(withCurrentFps(edited, 60)).toMatchObject({
			enteredFrameCount: 1500,
			entryFps: 24,
			currentFps: 60
		});
		expect(displayedFrameCount(withCurrentFps(edited, 60))).toBe(3750);
		expect(displayedFrameCount(withCurrentFps(withCurrentFps(edited, 60), 24))).toBe(1500);
	});
});

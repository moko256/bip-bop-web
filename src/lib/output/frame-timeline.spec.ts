import { describe, expect, it } from 'vitest';
import {
	DEFAULT_FPS,
	displayedFrameCount,
	initialFrameTimeline,
	maxFrameCountForFps,
	withCurrentFps,
	withEnteredFrameCount
} from './frame-timeline';

describe('frame timeline', () => {
	it('starts at one minute and 60 fps', () => {
		const timeline = initialFrameTimeline();

		expect(timeline.currentFps).toBe(DEFAULT_FPS);
		expect(displayedFrameCount(timeline)).toBe(3600);
		expect(maxFrameCountForFps(60)).toBe(216000);
		expect(maxFrameCountForFps(23.976)).toBe(86313);
	});

	it('keeps the duration when fps changes and restores the entered count', () => {
		let timeline = initialFrameTimeline();

		timeline = withCurrentFps(timeline, 24);
		expect(displayedFrameCount(timeline)).toBe(1440);

		timeline = withCurrentFps(timeline, 30);
		expect(displayedFrameCount(timeline)).toBe(1800);

		timeline = withCurrentFps(timeline, 60);
		expect(displayedFrameCount(timeline)).toBe(3600);
	});

	it('returns to the typed count after a fractional fps without rounding drift', () => {
		let timeline = withEnteredFrameCount(initialFrameTimeline(), 1000);

		timeline = withCurrentFps(timeline, 23.976);
		expect(displayedFrameCount(timeline)).toBe(Math.round((1000 * 23.976) / 60));

		timeline = withCurrentFps(timeline, 60);
		expect(displayedFrameCount(timeline)).toBe(1000);
	});

	it('does not clamp a rounded count that falls outside one hour', () => {
		let timeline = withEnteredFrameCount(initialFrameTimeline(), 216000);
		timeline = withCurrentFps(timeline, 23.976);
		const shown = displayedFrameCount(timeline);

		expect(shown).toBe(Math.round((216000 * 23.976) / 60));
		expect(shown).toBeGreaterThan(maxFrameCountForFps(23.976));

		timeline = withCurrentFps(timeline, 60);
		expect(displayedFrameCount(timeline)).toBe(216000);
	});

	it('replaces the baseline only when the typed count differs from the display', () => {
		const timeline = initialFrameTimeline();
		const same = withEnteredFrameCount(timeline, 3600);
		const at24 = withCurrentFps(timeline, 24);
		const edited = withEnteredFrameCount(at24, 1500);

		expect(same).toBe(timeline);
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

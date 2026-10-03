/** One minute at 60 fps. */
export const DEFAULT_FRAME_COUNT = 3600;

export const DEFAULT_FPS = 60;

export const FPS_PRESETS = [120, 60, 59.94, 50, 30, 29.97, 25, 24, 23.976] as const;

/** One hour at `fps`, in frames. */
export function maxFrameCountForFps(fps: number): number {
	return Math.floor(fps * 3600);
}

/**
 * The frame count the user entered, the fps at that moment, and the fps shown now.
 * Switching back to the entry fps restores the entered count without rounding.
 */
export type FrameTimeline = {
	enteredFrameCount: number;
	entryFps: number;
	currentFps: number;
};

export function initialFrameTimeline(): FrameTimeline {
	return {
		enteredFrameCount: DEFAULT_FRAME_COUNT,
		entryFps: DEFAULT_FPS,
		currentFps: DEFAULT_FPS
	};
}

/** Frame count shown for this timeline. Not clamped to the one-hour field max. */
export function displayedFrameCount(timeline: FrameTimeline): number {
	if (timeline.currentFps === timeline.entryFps) return timeline.enteredFrameCount;
	return Math.round((timeline.enteredFrameCount * timeline.currentFps) / timeline.entryFps);
}

/** Keep the entered count and move the current fps. */
export function withCurrentFps(timeline: FrameTimeline, fps: number): FrameTimeline {
	if (fps === timeline.currentFps) return timeline;
	return { ...timeline, currentFps: fps };
}

/**
 * A user-entered frame count becomes the new baseline at the current fps.
 * The same count as the one on screen leaves the baseline alone.
 */
export function withEnteredFrameCount(timeline: FrameTimeline, frameCount: number): FrameTimeline {
	if (frameCount === displayedFrameCount(timeline)) return timeline;
	return {
		enteredFrameCount: frameCount,
		entryFps: timeline.currentFps,
		currentFps: timeline.currentFps
	};
}

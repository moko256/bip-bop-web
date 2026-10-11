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
 * The shown count keeps the Timeline when the fps changes.
 * Switching back to the entry fps restores the entered count without rounding.
 */
export type FrameEntry = {
	enteredFrameCount: number;
	entryFps: number;
	currentFps: number;
};

export function initialFrameEntry(): FrameEntry {
	return {
		enteredFrameCount: DEFAULT_FRAME_COUNT,
		entryFps: DEFAULT_FPS,
		currentFps: DEFAULT_FPS
	};
}

/** Frame count shown for this entry. Not clamped to the one-hour field max. */
export function displayedFrameCount(entry: FrameEntry): number {
	if (entry.currentFps === entry.entryFps) return entry.enteredFrameCount;
	return Math.round((entry.enteredFrameCount * entry.currentFps) / entry.entryFps);
}

/** Keep the entered count and move the current fps. */
export function withCurrentFps(entry: FrameEntry, fps: number): FrameEntry {
	if (fps === entry.currentFps) return entry;
	return { ...entry, currentFps: fps };
}

/**
 * A user-entered frame count becomes the new baseline at the current fps.
 * The same count as the one on screen leaves the baseline alone.
 */
export function withEnteredFrameCount(entry: FrameEntry, frameCount: number): FrameEntry {
	if (frameCount === displayedFrameCount(entry)) return entry;
	return {
		enteredFrameCount: frameCount,
		entryFps: entry.currentFps,
		currentFps: entry.currentFps
	};
}

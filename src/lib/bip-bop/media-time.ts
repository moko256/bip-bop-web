import { BIP_BOP_FPS } from './timeline';

/** Timing the renderer draws. The renderer does not convert a frame count into this. */
export type FramePicture = {
	frame: number;
	elapsedSeconds: number;
	clockCentiseconds: number;
	/** Elapsed seconds of the previous sample. Omit before the first sample. */
	previousElapsedSeconds?: number;
	/**
	 * Use whole frames of the 60 fps grid for the circle, the field, and Bip/Bop.
	 * A 60 fps video sets this. The web preview does not.
	 */
	frameGrid?: boolean;
};

/**
 * Integer second at which a tone is placed for this frame, or null when this
 * frame does not cross a second boundary.
 * At 60 fps that is every frame whose index is divisible by 60.
 */
export function toneSecondAtFrame(frame: number, fps: number): number | null {
	if (frame === 0) return 0;
	const second = Math.floor(frame / fps);
	const previous = Math.floor((frame - 1) / fps);
	if (second === previous) return null;
	return second;
}

/** Seconds from the start of the picture to this frame. `frame / fps`. */
export function elapsedSecondsAtFrame(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || frame <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	return frame / fps;
}

/**
 * Corner-clock centiseconds for one video frame.
 * At 60 fps the count is `floor(frame * 100 / 60)`. Any other rate uses
 * `floor((frame / fps) * 100)`.
 */
export function clockCentisecondsAtFrame(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || frame <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	if (fps === BIP_BOP_FPS) return Math.floor((Math.trunc(frame) * 100) / BIP_BOP_FPS);
	return Math.max(0, Math.floor((frame / fps) * 100));
}

/** Corner-clock centiseconds for a live clock. Truncates; does not round. */
export function clockCentisecondsAtMs(elapsedMs: number): number {
	if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
	return Math.floor(elapsedMs / 10);
}

/**
 * Picture timing for one video frame.
 * Elapsed time is {@link elapsedSecondsAtFrame}. The 60 fps grid keeps
 * whole-frame colors; every other rate follows that elapsed time.
 */
export function videoPictureAtFrame(frame: number, fps: number): FramePicture {
	const index = Number.isFinite(frame) ? frame : 0;
	return {
		frame: index,
		elapsedSeconds: elapsedSecondsAtFrame(index, fps),
		clockCentiseconds: clockCentisecondsAtFrame(index, fps),
		previousElapsedSeconds: index > 0 ? elapsedSecondsAtFrame(index - 1, fps) : undefined,
		frameGrid: fps === BIP_BOP_FPS
	};
}

import { BIP_BOP_FPS } from './timeline';

/** Even seconds are Bip. Odd seconds are Bop. */
export type PictureBeat = 'bip' | 'bop';

/**
 * Timing the renderer draws. The frame count is only the digits in the center.
 * The circle, the field, and the Bip/Bop label follow `cycleFraction` and `beat`.
 */
export type FramePicture = {
	frame: number;
	clockCentiseconds: number;
	/**
	 * Fraction of the current second, in the same units as {@link FramePicture.cycleLength}.
	 * `cycleFraction / cycleLength` runs from 0 at the start of the second up to,
	 * but not including, 1. A video passes `frame % fps`. The web preview passes
	 * `elapsedSeconds % 1`.
	 */
	cycleFraction: number;
	/**
	 * Length of one second in {@link FramePicture.cycleFraction} units.
	 * A video passes `fps`. The web preview passes `1`.
	 */
	cycleLength: number;
	beat: PictureBeat;
	/** Draw the Bip! or Bop! label on this sample. */
	showBeat: boolean;
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

/** `frame % fps`, the cycle fraction for one video frame. 0 when that sample cannot be placed. */
export function videoCycleFraction(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || frame <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	return frame % fps;
}

/** Even whole seconds are Bip. Odd whole seconds are Bop. */
export function beatAtSecond(second: number): PictureBeat {
	const whole = Number.isFinite(second) ? Math.floor(second) : 0;
	return ((whole % 2) + 2) % 2 === 0 ? 'bip' : 'bop';
}

/**
 * Picture timing for one video frame.
 * The cycle fraction is {@link videoCycleFraction}. The label is drawn when that
 * fraction is 0. Elapsed time on the clock stays `frame / fps`.
 */
export function videoPictureAtFrame(frame: number, fps: number): FramePicture {
	const index = Number.isFinite(frame) ? frame : 0;
	const rate = Number.isFinite(fps) && fps > 0 ? fps : BIP_BOP_FPS;
	const cycleFraction = videoCycleFraction(index, rate);
	const second = index > 0 ? Math.floor(index / rate) : 0;
	return {
		frame: index,
		clockCentiseconds: clockCentisecondsAtFrame(index, rate),
		cycleFraction,
		cycleLength: rate,
		beat: beatAtSecond(second),
		showBeat: cycleFraction === 0
	};
}

/** Fractional second of a live clock. `elapsedSeconds % 1`. */
export function previewCycleFraction(elapsedSeconds: number): number {
	if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0;
	return elapsedSeconds % 1;
}

/** Bip on even elapsed seconds, Bop on odd ones. */
export function previewBeat(elapsedSeconds: number): PictureBeat {
	if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 'bip';
	return beatAtSecond(Math.floor(elapsedSeconds));
}

/**
 * The label is drawn when the cycle fraction wraps back toward 0.
 * The opening sample has no previous fraction, and draws when it sits at 0.
 */
export function previewShowBeat(
	cycleFraction: number,
	previousCycleFraction: number | null
): boolean {
	if (previousCycleFraction === null) return cycleFraction === 0;
	return cycleFraction < previousCycleFraction;
}

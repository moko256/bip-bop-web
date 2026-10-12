import { BIP_BOP_FPS } from './frames';

/** Even seconds are Bip. Odd seconds are Bop. */
export type PictureBeat = 'bip' | 'bop';

/**
 * Timing the renderer draws. The frame count is only the digits in the center.
 * The circle, the field, and the Bip/Bop label follow `cycleFraction` and `beat`.
 */
export type FramePicture = {
	frame: number;
	/** Corner digits. A video uses the frame. The web preview uses the preview clock. */
	elapsedCentiseconds: number;
	/**
	 * Share of the current second. 0 at the start, approaching 1 at the end.
	 * A video passes the fractional part of `frame / fps`. The web preview passes
	 * `elapsedSeconds % 1`.
	 */
	cycleFraction: number;
	beat: PictureBeat;
	/** Draw the Bip! or Bop! label on this sample. */
	showBeat: boolean;
};

/**
 * Timeline seconds at the start of `frame`.
 * 0 when the frame or the rate cannot be placed.
 */
export function secondsAtFrame(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || frame <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	return frame / fps;
}

/** Whole Timeline seconds at the start of `frame`. */
export function wholeSecondsAtFrame(frame: number, fps: number): number {
	return Math.floor(secondsAtFrame(frame, fps));
}

/**
 * Frame index at a Timeline position. Partial frames are truncated.
 * 0 when the position or the rate cannot be placed.
 */
export function frameAtSeconds(seconds: number, fps: number): number {
	if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	return Math.floor((seconds * 1000 * fps) / 1000);
}

/**
 * Integer second at which a tone is placed for this frame, or null when this
 * frame does not cross a second boundary.
 * At 60 fps that is every frame whose index is divisible by 60.
 */
export function toneSecondAtFrame(frame: number, fps: number): number | null {
	if (frame === 0) return 0;
	const second = wholeSecondsAtFrame(frame, fps);
	const previous = wholeSecondsAtFrame(frame - 1, fps);
	if (second === previous) return null;
	return second;
}

/**
 * Elapsed centiseconds for one video frame.
 * At 60 fps the count is `floor(frame * 100 / 60)`. Any other rate uses
 * `floor((frame / fps) * 100)`.
 */
export function elapsedCentisecondsAtFrame(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || frame <= 0 || !Number.isFinite(fps) || fps <= 0) return 0;
	if (fps === BIP_BOP_FPS) return Math.floor((Math.trunc(frame) * 100) / BIP_BOP_FPS);
	return Math.floor(secondsAtFrame(frame, fps) * 100);
}

/** Elapsed centiseconds from the preview clock. Truncates; does not round. */
export function elapsedCentisecondsAtMs(elapsedMs: number): number {
	if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
	return Math.floor(elapsedMs / 10);
}

/**
 * Share of the current second for one video frame.
 * 0 at a whole second, approaching 1 at the next. 0 when that sample cannot be placed.
 */
export function videoCycleFraction(frame: number, fps: number): number {
	const seconds = secondsAtFrame(frame, fps);
	return seconds - Math.floor(seconds);
}

/** Even whole seconds are Bip. Odd whole seconds are Bop. */
export function beatAtSecond(second: number): PictureBeat {
	const whole = Number.isFinite(second) ? Math.floor(second) : 0;
	return ((whole % 2) + 2) % 2 === 0 ? 'bip' : 'bop';
}

/**
 * Picture timing for one video frame.
 * The cycle fraction is {@link videoCycleFraction}. The label is drawn when that
 * fraction is 0. Elapsed time stays {@link secondsAtFrame}.
 */
export function videoPictureAtFrame(frame: number, fps: number): FramePicture {
	const index = Number.isFinite(frame) ? frame : 0;
	const rate = Number.isFinite(fps) && fps > 0 ? fps : BIP_BOP_FPS;
	const cycleFraction = videoCycleFraction(index, rate);
	const second = wholeSecondsAtFrame(index, rate);
	return {
		frame: index,
		elapsedCentiseconds: elapsedCentisecondsAtFrame(index, rate),
		cycleFraction,
		beat: beatAtSecond(second),
		showBeat: cycleFraction === 0
	};
}

/** Fractional second of the preview clock. `elapsedSeconds % 1`. */
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

import { BIP_BOP_FPS } from './timeline';

/** Even seconds are Bip. Odd seconds are Bop. */
export type PictureBeat = 'bip' | 'bop';

/**
 * Timing the renderer draws. The frame count is only the digits in the center.
 * The circle, the field, and the Bip/Bop label follow `coefficient` and `beat`.
 */
export type FramePicture = {
	frame: number;
	clockCentiseconds: number;
	/**
	 * Position in the current second.
	 * A video passes `frame % fps`. The web preview passes `elapsedSeconds % 1`.
	 */
	coefficient: number;
	/**
	 * Amount of {@link FramePicture.coefficient} that fills one second.
	 * A video passes `fps`. The web preview passes `1`.
	 */
	coefficientSpan: number;
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

/** `frame % fps`, or 0 when the frame or the rate cannot place a sample. */
export function videoCoefficient(frame: number, fps: number): number {
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
 * The coefficient is {@link videoCoefficient}. The label is drawn when that
 * coefficient is 0. Elapsed time on the clock stays `frame / fps`.
 */
export function videoPictureAtFrame(frame: number, fps: number): FramePicture {
	const index = Number.isFinite(frame) ? frame : 0;
	const rate = Number.isFinite(fps) && fps > 0 ? fps : BIP_BOP_FPS;
	const coefficient = videoCoefficient(index, rate);
	const second = index > 0 ? Math.floor(index / rate) : 0;
	return {
		frame: index,
		clockCentiseconds: clockCentisecondsAtFrame(index, rate),
		coefficient,
		coefficientSpan: rate,
		beat: beatAtSecond(second),
		showBeat: coefficient === 0
	};
}

/** Fractional second of a live clock. `elapsedSeconds % 1`. */
export function previewCoefficient(elapsedSeconds: number): number {
	if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 0;
	return elapsedSeconds % 1;
}

/** Bip on even elapsed seconds, Bop on odd ones. */
export function previewBeat(elapsedSeconds: number): PictureBeat {
	if (!Number.isFinite(elapsedSeconds) || elapsedSeconds <= 0) return 'bip';
	return beatAtSecond(Math.floor(elapsedSeconds));
}

/**
 * The label is drawn when the coefficient wraps back toward 0.
 * The opening sample has no previous coefficient, and draws when it sits at 0.
 */
export function previewShowBeat(coefficient: number, previousCoefficient: number | null): boolean {
	if (previousCoefficient === null) return coefficient === 0;
	return coefficient < previousCoefficient;
}

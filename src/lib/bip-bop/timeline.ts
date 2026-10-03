/** Frames in one second of the Bip-Bop picture. */
export const BIP_BOP_FPS = 60;

/** Default length of an exported video. */
export const BIP_BOP_DURATION_SECONDS = 10;

/** Last frame index. Ten seconds at {@link BIP_BOP_FPS}. */
export const BIP_BOP_MAX_FRAME = BIP_BOP_FPS * BIP_BOP_DURATION_SECONDS;

/**
 * Frame index on the 60 fps grid for an elapsed time.
 * Partial frames are truncated.
 */
export function frameAtElapsedMs(elapsedMs: number): number {
	if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 0;
	return Math.floor((elapsedMs * BIP_BOP_FPS) / 1000);
}

/**
 * Frame index for a media time in seconds.
 * Truncates like {@link frameAtElapsedMs}, and stops at {@link BIP_BOP_MAX_FRAME}.
 */
export function frameAtSeconds(seconds: number): number {
	if (!Number.isFinite(seconds) || seconds <= 0) return 0;
	return Math.min(BIP_BOP_MAX_FRAME, frameAtElapsedMs(seconds * 1000));
}

/** Seconds from the start of the picture to the start of `frame`. */
export function secondsAtFrame(frame: number): number {
	if (!Number.isFinite(frame) || frame <= 0) return 0;
	return frame / BIP_BOP_FPS;
}

import { wholeSecondsAtFrame } from '$lib/bip-bop/media-time';

/** `MM:SS` or `HH:MM:SS` for one side of the playback time. */
function formatPart(frame: number, fps: number, withHours: boolean): string {
	const total = wholeSecondsAtFrame(frame, fps);
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);
	const minutesAndSeconds = `${pad2(minutes)}:${pad2(seconds)}`;
	if (!withHours) return minutesAndSeconds;
	return `${pad2(hours)}:${minutesAndSeconds}`;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Playback position and length, in whole seconds.
 * Hours appear on both sides once either side reaches one hour.
 */
export function formatPlaybackTime(frame: number, maxFrame: number, fps: number): string {
	const withHours =
		Math.max(wholeSecondsAtFrame(frame, fps), wholeSecondsAtFrame(maxFrame, fps)) >= 3600;
	return `${formatPart(frame, fps, withHours)} / ${formatPart(maxFrame, fps, withHours)}`;
}

/**
 * Frame index accepted by the transport.
 * Stops at `maxFrame` when a length is given. Otherwise only the zero bound applies.
 */
export function clampFrame(frame: number, maxFrame?: number): number {
	if (!Number.isFinite(frame)) return 0;
	const index = Math.max(0, Math.trunc(frame));
	if (maxFrame === undefined) return index;
	const limit = Number.isFinite(maxFrame) ? Math.max(0, Math.trunc(maxFrame)) : 0;
	return Math.min(limit, index);
}

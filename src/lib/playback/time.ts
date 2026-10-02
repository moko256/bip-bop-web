/** `MM:SS` or `HH:MM:SS` for one side of the playback clock. */
function wholeSeconds(frame: number, fps: number): number {
	if (!Number.isFinite(frame) || !Number.isFinite(fps) || fps <= 0 || frame <= 0) return 0;
	return Math.floor(frame / fps);
}

function formatPart(frame: number, fps: number, withHours: boolean): string {
	const total = wholeSeconds(frame, fps);
	const seconds = total % 60;
	const minutes = Math.floor(total / 60) % 60;
	const hours = Math.floor(total / 3600);
	const clock = `${pad2(minutes)}:${pad2(seconds)}`;
	if (!withHours) return clock;
	return `${pad2(hours)}:${clock}`;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/**
 * Playback position and length, in whole seconds.
 * Hours appear on both sides once either side reaches one hour.
 */
export function formatPlaybackTime(frame: number, maxFrame: number, fps: number): string {
	const withHours = Math.max(wholeSeconds(frame, fps), wholeSeconds(maxFrame, fps)) >= 3600;
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

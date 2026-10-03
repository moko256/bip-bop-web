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

/** Shortest decimal spelling of a frame rate, without trailing zeros. */
export function formatFpsNumber(fps: number): string {
	if (Number.isInteger(fps)) return String(fps);
	return fps.toFixed(12).replace(/0+$/, '').replace(/\.$/, '');
}

/** Corner label, such as `60FPS` or `59.94FPS`. */
export function formatFpsOverlay(fps: number): string {
	return `${formatFpsNumber(fps)}FPS`;
}

/** Filename token, with the decimal point written as a hyphen. */
export function formatFpsFilenameToken(fps: number): string {
	return formatFpsNumber(fps).replaceAll('.', '-');
}

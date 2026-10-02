/** Time source for a playback adapter. Production uses the browser. Tests move time themselves. */
export type PlaybackClock = {
	now(): number;
	requestFrame(callback: () => void): number;
	cancelFrame(id: number): void;
	delay(ms: number, callback: () => void): number;
	cancelDelay(id: number): void;
};

export function browserPlaybackClock(): PlaybackClock {
	return {
		now: () => Date.now(),
		requestFrame: (callback) => requestAnimationFrame(() => callback()),
		cancelFrame: (id) => cancelAnimationFrame(id),
		delay: (ms, callback) => window.setTimeout(callback, ms),
		cancelDelay: (id) => window.clearTimeout(id)
	};
}

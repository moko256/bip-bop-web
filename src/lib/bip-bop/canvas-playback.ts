import type { PlaybackAdapter, PlaybackHost } from '$lib/playback/PlaybackSession.svelte';
import type { PlaybackClock } from '$lib/playback/clock';
import { bipBopPreviewPictureMs } from './audio';
import { frameAtElapsedMs, secondsAtFrame } from './timeline';
import { scheduleLiveTones } from './tone-schedule';

/** Live Bip/Bop bursts while the canvas clock is running. */
export type CanvasAudio = {
	start(elapsedMs: number, getElapsed: () => number, onReady: () => void): void;
	stop(): void;
	/** How long the picture waits at playback start, in milliseconds. */
	pictureShiftMs(): number;
};

/**
 * Frames to wait for `AudioContext.outputLatency` after the play click.
 * Chrome reports 0 in that turn, then the real latency once the device starts.
 */
const OUTPUT_LATENCY_WAIT_FRAMES = 8;

/** `AudioContext.outputLatency` in milliseconds. Missing or not yet reported reads as 0. */
function reportedOutputLatencyMs(context: AudioContext): number {
	const latency = context.outputLatency;
	if (typeof latency !== 'number' || !Number.isFinite(latency) || latency <= 0) return 0;
	return latency * 1000;
}

export function liveCanvasAudio(clock: PlaybackClock): CanvasAudio {
	let audio: AudioContext | null = null;
	let active = false;
	let getElapsed = () => 0;
	let cancelTones = () => {};
	let cancelLatencyWait = () => {};
	let pictureShiftMs = 0;

	return {
		pictureShiftMs: () => pictureShiftMs,
		start(elapsedMs, elapsed, onReady) {
			active = true;
			getElapsed = elapsed;
			cancelLatencyWait();
			cancelLatencyWait = () => {};
			const previous = audio;
			// Playback favors a steady buffer. outputLatency is how long that
			// buffer holds a burst, so the opening sound is scheduled past it.
			audio = new AudioContext({ latencyHint: 'playback' });
			if (previous) void previous.close();
			const context = audio;
			const run = (elapsedNow: number) => {
				if (!active || audio !== context) return;
				cancelTones();
				// Rebase the picture clock before reading outputLatency into the cue,
				// so the opening hold is measured from this instant.
				onReady();
				const stop = scheduleLiveTones({
					context,
					elapsedMs: elapsedNow,
					getElapsed,
					clock,
					active: () => active && audio === context
				});
				pictureShiftMs = stop.pictureShiftMs;
				cancelTones = stop;
			};
			// A 16ms burst scheduled while outputLatency is still 0 ends before
			// the context clock jumps, so the opening Bip never reaches the speakers.
			const begin = () => {
				if (!active || audio !== context) return;
				if (reportedOutputLatencyMs(context) > 0) {
					run(elapsedMs);
					return;
				}
				let frames = 0;
				let frameId = 0;
				let waiting = true;
				const stopWaiting = () => {
					waiting = false;
					clock.cancelFrame(frameId);
					frameId = 0;
				};
				cancelLatencyWait = stopWaiting;
				const step = () => {
					if (!waiting || !active || audio !== context) return;
					frames += 1;
					if (reportedOutputLatencyMs(context) > 0 || frames >= OUTPUT_LATENCY_WAIT_FRAMES) {
						stopWaiting();
						cancelLatencyWait = () => {};
						run(elapsedMs);
						return;
					}
					frameId = clock.requestFrame(step);
				};
				frameId = clock.requestFrame(step);
			};
			if (context.state === 'running') {
				begin();
				return;
			}
			void context
				.resume()
				.then(() => {
					if (!active || audio !== context) return;
					begin();
				})
				.catch(() => {
					// Unmount closes the context while this promise can still be pending.
				});
		},
		stop() {
			active = false;
			pictureShiftMs = 0;
			cancelLatencyWait();
			cancelLatencyWait = () => {};
			cancelTones();
			cancelTones = () => {};
			const previous = audio;
			audio = null;
			if (previous) void previous.close();
		}
	};
}

/** Canvas clock adapter. Tones follow the wall clock. The picture waits out the opening burst. */
export function canvasPlayback(
	clock: PlaybackClock,
	audio: CanvasAudio = liveCanvasAudio(clock)
): (host: PlaybackHost) => PlaybackAdapter {
	return (host) => {
		let running = false;
		let rafId = 0;
		let startedAt = 0;
		let startElapsedMs = 0;
		let disposed = false;

		function elapsedNow(): number {
			return clock.now() - startedAt;
		}

		function stopClock() {
			clock.cancelFrame(rafId);
			rafId = 0;
			running = false;
			audio.stop();
		}

		function tick() {
			if (disposed || !running) return;
			const pictureMs = bipBopPreviewPictureMs(
				elapsedNow(),
				audio.pictureShiftMs(),
				startElapsedMs
			);
			const next = frameAtElapsedMs(pictureMs);
			host.advance(next);
			if (disposed || !running) return;
			rafId = clock.requestFrame(tick);
		}

		function arm(frame: number) {
			stopClock();
			const elapsedMs = secondsAtFrame(frame) * 1000;
			startElapsedMs = elapsedMs;
			startedAt = clock.now() - elapsedMs;
			running = true;
			audio.start(elapsedMs, elapsedNow, () => {
				if (disposed || !running) return;
				startedAt = clock.now() - elapsedMs;
				clock.cancelFrame(rafId);
				rafId = clock.requestFrame(tick);
			});
		}

		return {
			start(frame) {
				if (disposed) return;
				arm(frame);
			},
			stop() {
				stopClock();
			},
			place(frame) {
				if (disposed || !running) return;
				arm(frame);
			},
			atEnd() {
				return false;
			},
			dispose() {
				disposed = true;
				stopClock();
			}
		};
	};
}

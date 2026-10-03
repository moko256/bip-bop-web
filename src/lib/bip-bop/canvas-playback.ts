import type { PlaybackAdapter, PlaybackHost } from '$lib/playback/PlaybackSession.svelte';
import type { PlaybackClock } from '$lib/playback/clock';
import { bipBopPreviewPictureMs } from './audio';
import { clockCentisecondsAtMs } from './media-time';
import { scheduleLiveTones } from './tone-schedule';

/**
 * Web preview picture clock.
 * `elapsedSeconds` is time since playback started. The frame counter lives on
 * the session and is not derived from this clock. `previewFps` is the rounded
 * rate since the previous animation frame, or null until two frames exist.
 */
export type CanvasPicture = {
	elapsedSeconds: number;
	/** Previous sample. Negative before the first movement. */
	previousElapsedSeconds: number;
	clockCentiseconds: number;
	previewFps: number | null;
};

export function createCanvasPicture(): CanvasPicture {
	return {
		elapsedSeconds: 0,
		previousElapsedSeconds: -1,
		clockCentiseconds: 0,
		previewFps: null
	};
}

/** Live Bip/Bop bursts while the canvas clock is running. */
export type CanvasAudio = {
	start(elapsedMs: number, getElapsed: () => number, onReady: () => void): void;
	stop(): void;
	/** Drop the playback context when the preview is gone. */
	dispose?(): void;
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
	let generation = 0;
	let getElapsed = () => 0;
	let cancelTones = () => {};
	let cancelLatencyWait = () => {};
	let pictureShiftMs = 0;

	function ensureContext(): AudioContext {
		if (!audio || audio.state === 'closed') {
			// Playback favors a steady buffer. outputLatency is how long that
			// buffer holds a burst, so the opening sound is scheduled past it.
			// One context stays for the preview. Pause suspends it.
			audio = new AudioContext({ latencyHint: 'playback' });
		}
		return audio;
	}

	function releaseGraph() {
		cancelLatencyWait();
		cancelLatencyWait = () => {};
		cancelTones();
		cancelTones = () => {};
	}

	return {
		pictureShiftMs: () => pictureShiftMs,
		start(elapsedMs, elapsed, onReady) {
			active = true;
			generation += 1;
			const generationAtStart = generation;
			getElapsed = elapsed;
			releaseGraph();
			const context = ensureContext();
			const current = () => active && audio === context && generation === generationAtStart;
			const run = (elapsedNow: number) => {
				if (!current()) return;
				cancelTones();
				// Rebase the picture clock before reading outputLatency into the cue,
				// so the opening hold is measured from this instant.
				onReady();
				const stop = scheduleLiveTones({
					context,
					elapsedMs: elapsedNow,
					getElapsed,
					clock,
					active: current
				});
				pictureShiftMs = stop.pictureShiftMs;
				cancelTones = stop;
			};
			// A 16ms burst scheduled while outputLatency is still 0 ends before
			// the context clock jumps, so the opening Bip never reaches the speakers.
			const begin = () => {
				if (!current()) return;
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
					if (!waiting || !current()) return;
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
			const resumeAndBegin = () => {
				if (!current()) return;
				if (context.state === 'running') {
					begin();
					return;
				}
				void context
					.resume()
					.then(() => {
						if (!current()) return;
						begin();
					})
					.catch(() => {
						// Unmount closes the context while this promise can still be pending.
					});
			};
			resumeAndBegin();
		},
		stop() {
			active = false;
			pictureShiftMs = 0;
			releaseGraph();
			const context = audio;
			if (!context || context.state === 'closed') return;
			const generationAtStop = generation;
			// arm() stops and starts in one turn. Wait a task so that restart can
			// cancel the suspend before it reaches the device.
			queueMicrotask(() => {
				if (generation !== generationAtStop || active || audio !== context) return;
				if (context.state !== 'running') return;
				void context
					.suspend()
					.then(() => {
						// A play click won the race after suspend was already issued.
						if (!active || audio !== context || context.state !== 'suspended') return;
						void context.resume().catch(() => {});
					})
					.catch(() => {});
			});
		},
		dispose() {
			active = false;
			generation += 1;
			pictureShiftMs = 0;
			releaseGraph();
			const context = audio;
			audio = null;
			if (context && context.state !== 'closed') void context.close();
		}
	};
}

/**
 * Canvas clock adapter. Tones follow the wall clock. The picture waits out the opening burst.
 * Each animation frame adds one to the frame counter. Elapsed time is time since
 * playback started, not `frame / fps`.
 */
export function canvasPlayback(
	clock: PlaybackClock,
	audio: CanvasAudio = liveCanvasAudio(clock),
	picture: CanvasPicture = createCanvasPicture()
): (host: PlaybackHost) => PlaybackAdapter {
	return (host) => {
		let running = false;
		let rafId = 0;
		let startedAt = 0;
		let startElapsedMs = 0;
		let pictureElapsedMs = 0;
		let frameCount = 0;
		let previousFrameAt: number | null = null;
		let disposed = false;

		function elapsedNow(): number {
			return clock.now() - startedAt;
		}

		function publish(elapsedMs: number, previewFps: number | null): void {
			const elapsedSeconds = elapsedMs > 0 && Number.isFinite(elapsedMs) ? elapsedMs / 1000 : 0;
			if (picture.elapsedSeconds !== elapsedSeconds) {
				picture.previousElapsedSeconds = picture.elapsedSeconds;
			}
			picture.elapsedSeconds = elapsedSeconds;
			picture.clockCentiseconds = clockCentisecondsAtMs(elapsedMs);
			if (previewFps !== null) picture.previewFps = previewFps;
		}

		/** Rounded FPS from the gap since the previous animation frame. */
		function measuredFps(now: number): number | null {
			const previous = previousFrameAt;
			previousFrameAt = now;
			if (previous === null) return null;
			const delta = now - previous;
			if (!Number.isFinite(delta) || delta <= 0) return null;
			return Math.round(1000 / delta);
		}

		function stopClock() {
			if (running) {
				pictureElapsedMs = bipBopPreviewPictureMs(
					elapsedNow(),
					audio.pictureShiftMs(),
					startElapsedMs
				);
			}
			previousFrameAt = null;
			clock.cancelFrame(rafId);
			rafId = 0;
			running = false;
			audio.stop();
		}

		function tick() {
			if (disposed || !running) return;
			const previewFps = measuredFps(clock.now());
			frameCount += 1;
			const pictureMs = bipBopPreviewPictureMs(
				elapsedNow(),
				audio.pictureShiftMs(),
				startElapsedMs
			);
			pictureElapsedMs = pictureMs;
			publish(pictureMs, previewFps);
			host.advance(frameCount);
			if (disposed || !running) return;
			rafId = clock.requestFrame(tick);
		}

		function arm(frame: number) {
			stopClock();
			frameCount = frame;
			startElapsedMs = pictureElapsedMs;
			startedAt = clock.now() - pictureElapsedMs;
			running = true;
			audio.start(pictureElapsedMs, elapsedNow, () => {
				if (disposed || !running) return;
				startedAt = clock.now() - pictureElapsedMs;
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
				frameCount = frame;
			},
			atEnd() {
				return false;
			},
			dispose() {
				disposed = true;
				stopClock();
				audio.dispose?.();
			}
		};
	};
}

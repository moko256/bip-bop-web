import type { PlaybackAdapter, PlaybackHost } from '$lib/playback/PlaybackSession.svelte';
import type { PlaybackClock } from '$lib/playback/clock';
import { BipBopAudioRenderer, planBipBopTone } from './audio';
import { BIP_BOP_MAX_FRAME, frameAtElapsedMs, secondsAtFrame } from './timeline';

/** Live Bip/Bop bursts while the canvas clock is running. */
export type CanvasAudio = {
	start(elapsedMs: number, getElapsed: () => number): void;
	stop(): void;
};

export function liveCanvasAudio(clock: PlaybackClock): CanvasAudio {
	let audio: AudioContext | null = null;
	let timer = 0;
	let active = false;
	let getElapsed = () => 0;

	function schedule(elapsedMs: number) {
		if (!active) return;
		const context = audio;
		if (!context || context.state !== 'running') return;
		const plan = planBipBopTone(elapsedMs);
		BipBopAudioRenderer(context, plan.delayMs, plan.frequencyHz);
		timer = clock.delay(plan.waitMs, () => schedule(getElapsed()));
	}

	return {
		start(elapsedMs, elapsed) {
			active = true;
			getElapsed = elapsed;
			const previous = audio;
			audio = new AudioContext();
			if (previous) void previous.close();
			const context = audio;
			const run = (elapsedNow: number) => {
				if (!active || audio !== context) return;
				schedule(elapsedNow);
			};
			if (context.state === 'running') {
				run(elapsedMs);
				return;
			}
			void context
				.resume()
				.then(() => run(Math.max(elapsedMs, getElapsed())))
				.catch(() => {
					// Unmount closes the context while this promise can still be pending.
				});
		},
		stop() {
			active = false;
			clock.cancelDelay(timer);
			timer = 0;
			const previous = audio;
			audio = null;
			if (previous) void previous.close();
		}
	};
}

/** Canvas clock adapter. Wall time advances the frame. Tones follow that clock. */
export function canvasPlayback(
	clock: PlaybackClock,
	audio: CanvasAudio = liveCanvasAudio(clock)
): (host: PlaybackHost) => PlaybackAdapter {
	return (host) => {
		let running = false;
		let rafId = 0;
		let startedAt = 0;
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
			const next = Math.min(BIP_BOP_MAX_FRAME, frameAtElapsedMs(elapsedNow()));
			host.advance(next);
			if (disposed || !running) return;
			rafId = clock.requestFrame(tick);
		}

		function arm(frame: number) {
			stopClock();
			const elapsedMs = secondsAtFrame(frame) * 1000;
			startedAt = clock.now() - elapsedMs;
			running = true;
			audio.start(elapsedMs, elapsedNow);
			rafId = clock.requestFrame(tick);
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

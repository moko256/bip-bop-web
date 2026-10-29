import { frameAtSeconds, secondsAtFrame } from '#lib/bip-bop/media-time.js';
import { untrack } from 'svelte';
import type { Scheduler } from './scheduler';
import type { PlaybackAdapter, PlaybackHost } from './PlaybackSession.svelte';

/**
 * Video element adapter. The element owns currentTime.
 * Frame conversion reads playback bounds from the session.
 * `attach` binds whichever element the page mounted.
 */
export function videoPlayback(scheduler: Scheduler): {
	connect: (host: PlaybackHost) => PlaybackAdapter;
	attach: (video: HTMLVideoElement) => () => void;
} {
	let host: PlaybackHost | undefined;

	function readBounds(): { fps: number; maxFrame?: number } {
		return host?.bounds() ?? { fps: 0 };
	}

	function frameAt(seconds: number): number {
		const { fps, maxFrame } = readBounds();
		const frame = frameAtSeconds(seconds, fps);
		if (maxFrame === undefined) return frame;
		return Math.min(maxFrame, frame);
	}

	function secondsAt(frame: number): number {
		return secondsAtFrame(frame, readBounds().fps);
	}
	let element: HTMLVideoElement | undefined;
	let detachListeners = () => {};
	let running = false;
	let raf = 0;

	function stopRaf() {
		scheduler.cancelFrame(raf);
		raf = 0;
	}

	function tick() {
		const video = element;
		if (!video || !host || !running) return;
		host.advance(frameAt(video.currentTime));
		if (!running) return;
		raf = scheduler.requestFrame(tick);
	}

	function startRaf() {
		stopRaf();
		if (!running) return;
		raf = scheduler.requestFrame(tick);
	}

	return {
		connect(next) {
			host = next;
			return {
				start(frame) {
					running = true;
					const video = element;
					if (video) video.currentTime = secondsAt(frame);
					void video?.play().catch(() => host?.halt());
					startRaf();
				},
				stop() {
					running = false;
					stopRaf();
					element?.pause();
				},
				place(frame) {
					if (element) element.currentTime = secondsAt(frame);
				},
				atEnd() {
					return element?.ended === true;
				},
				dispose() {
					running = false;
					stopRaf();
					detachListeners();
					element = undefined;
				}
			};
		},
		attach(video) {
			detachListeners();
			element = video;
			const update = () => {
				if (!host) return;
				host.advance(frameAt(video.currentTime));
			};
			const onPlay = () => {
				running = true;
				startRaf();
			};
			const onPause = () => {
				host?.halt();
				update();
			};
			video.addEventListener('play', onPlay);
			video.addEventListener('pause', onPause);
			video.addEventListener('ended', onPause);
			video.addEventListener('seeked', update);
			video.addEventListener('timeupdate', update);
			// advance() reads the session. Tracking that read would re-run the
			// caller's attachment on every frame and revoke the blob URL.
			untrack(update);
			detachListeners = () => {
				if (element === video) element = undefined;
				running = false;
				stopRaf();
				video.removeEventListener('play', onPlay);
				video.removeEventListener('pause', onPause);
				video.removeEventListener('ended', onPause);
				video.removeEventListener('seeked', update);
				video.removeEventListener('timeupdate', update);
			};
			return detachListeners;
		}
	};
}

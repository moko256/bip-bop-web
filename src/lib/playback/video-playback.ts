import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from '$lib/bip-bop/timeline';
import type { PlaybackClock } from './clock';
import type { PlaybackAdapter, PlaybackHost } from './PlaybackSession.svelte';

export type VideoPlaybackTimeline = {
	fps: number;
	maxFrame: number;
};

/**
 * Video element adapter. The element owns the clock.
 * `attach` binds whichever element the page mounted.
 */
export function videoPlayback(
	clock: PlaybackClock,
	timeline: VideoPlaybackTimeline = { fps: BIP_BOP_FPS, maxFrame: BIP_BOP_MAX_FRAME }
): {
	connect: (host: PlaybackHost) => PlaybackAdapter;
	attach: (video: HTMLVideoElement) => () => void;
} {
	function frameAt(seconds: number): number {
		if (!Number.isFinite(seconds) || seconds <= 0) return 0;
		return Math.min(timeline.maxFrame, Math.floor((seconds * 1000 * timeline.fps) / 1000));
	}

	function secondsAt(frame: number): number {
		if (!Number.isFinite(frame) || frame <= 0) return 0;
		return frame / timeline.fps;
	}
	let element: HTMLVideoElement | undefined;
	let detachListeners = () => {};
	let running = false;
	let raf = 0;
	let host: PlaybackHost | undefined;

	function stopRaf() {
		clock.cancelFrame(raf);
		raf = 0;
	}

	function tick() {
		const video = element;
		if (!video || !host || !running) return;
		host.advance(frameAt(video.currentTime));
		if (!running) return;
		raf = clock.requestFrame(tick);
	}

	function startRaf() {
		stopRaf();
		if (!running) return;
		raf = clock.requestFrame(tick);
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
			update();
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

import { describe, expect, it, vi } from 'vitest';
import { PlaybackSession } from './PlaybackSession.svelte';
import type { Scheduler } from './scheduler';
import { videoPlayback } from './video-playback';
import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from '#lib/bip-bop/frames';

function manualScheduler() {
	let now = 0;
	let nextId = 1;
	const frames = new Map<number, () => void>();
	const scheduler: Scheduler = {
		now: () => now,
		requestFrame(callback) {
			const id = nextId++;
			frames.set(id, callback);
			return id;
		},
		cancelFrame(id) {
			frames.delete(id);
		},
		delay(ms, callback) {
			void ms;
			void callback;
			return nextId++;
		},
		cancelDelay() {}
	};
	return {
		scheduler,
		flush() {
			const queued = [...frames.values()];
			frames.clear();
			for (const callback of queued) callback();
		},
		advance(ms: number) {
			now += ms;
			this.flush();
		}
	};
}

function fakeVideo() {
	const listeners = new Map<string, Set<() => void>>();
	return {
		currentTime: 0,
		ended: false,
		play: vi.fn(() => Promise.resolve()),
		pause: vi.fn(),
		addEventListener(type: string, listener: () => void) {
			const set = listeners.get(type) ?? new Set<() => void>();
			set.add(listener);
			listeners.set(type, set);
		},
		removeEventListener(type: string, listener: () => void) {
			listeners.get(type)?.delete(listener);
		},
		emit(type: string) {
			for (const listener of [...(listeners.get(type) ?? [])]) listener();
		}
	};
}

describe('video playback', () => {
	it('plays, seeks, and pauses the element from the session', () => {
		const time = manualScheduler();
		const element = fakeVideo();
		const side = videoPlayback(time.scheduler);
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: side.connect
		});
		side.attach(element as unknown as HTMLVideoElement);

		session.setPlaying(true);
		expect(element.play).toHaveBeenCalledOnce();
		expect(session.playing).toBe(true);

		session.seek(90);
		expect(element.currentTime).toBeCloseTo(1.5);
		expect(session.frame).toBe(90);
		expect(session.playing).toBe(true);

		session.setPlaying(false);
		expect(element.pause).toHaveBeenCalled();
		expect(session.playing).toBe(false);
	});

	it('reads currentTime in frames and stops at ten seconds', () => {
		const time = manualScheduler();
		const element = fakeVideo();
		const side = videoPlayback(time.scheduler);
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: side.connect
		});
		side.attach(element as unknown as HTMLVideoElement);
		session.setPlaying(true);

		element.currentTime = 1.016;
		time.flush();
		expect(session.frame).toBe(60);

		element.currentTime = 10;
		time.flush();
		expect(session.frame).toBe(600);
		expect(session.playing).toBe(false);
	});

	it('seeks with the session playback bounds', () => {
		const time = manualScheduler();
		const element = fakeVideo();
		const side = videoPlayback(time.scheduler);
		const session = new PlaybackSession({
			maxFrame: 240,
			fps: 24,
			connect: side.connect
		});
		side.attach(element as unknown as HTMLVideoElement);

		session.seek(12);

		expect(element.currentTime).toBeCloseTo(0.5);
		expect(session.frame).toBe(12);
	});

	it('seeks and reads currentTime with bounds set after the adapter connected', () => {
		const time = manualScheduler();
		const element = fakeVideo();
		const side = videoPlayback(time.scheduler);
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: side.connect
		});
		side.attach(element as unknown as HTMLVideoElement);

		session.setBounds(240, 24);
		session.seek(12);
		expect(element.currentTime).toBeCloseTo(0.5);
		expect(session.frame).toBe(12);

		session.setPlaying(true);
		element.currentTime = 0.5;
		time.flush();
		expect(session.frame).toBe(12);
	});

	it('restarts a finished element at the first frame', () => {
		const time = manualScheduler();
		const element = fakeVideo();
		element.ended = true;
		element.currentTime = 10;
		const side = videoPlayback(time.scheduler);
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: side.connect
		});
		side.attach(element as unknown as HTMLVideoElement);
		session.seek(599);

		session.setPlaying(true);

		expect(session.frame).toBe(0);
		expect(element.currentTime).toBe(0);
		expect(element.play).toHaveBeenCalledOnce();
	});
});

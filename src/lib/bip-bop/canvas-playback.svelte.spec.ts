import { afterEach, describe, expect, it } from 'vitest';
import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
import type { PlaybackClock } from '$lib/playback/clock';
import {
	canvasPlayback,
	createCanvasPicture,
	liveCanvasAudio,
	type CanvasAudio,
	type CanvasPicture
} from './canvas-playback';
import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from './timeline';

function manualClock() {
	let now = 0;
	let nextId = 1;
	const frames = new Map<number, () => void>();
	const delays = new Map<number, { at: number; callback: () => void }>();
	const clock: PlaybackClock = {
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
			const id = nextId++;
			delays.set(id, { at: now + ms, callback });
			return id;
		},
		cancelDelay(id) {
			delays.delete(id);
		}
	};
	return {
		clock,
		flush() {
			const due = [...delays.entries()].filter(([, timer]) => timer.at <= now);
			for (const [id, timer] of due) {
				delays.delete(id);
				timer.callback();
			}
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

function recordingAudio(): CanvasAudio & { events: string[] } {
	const events: string[] = [];
	return {
		events,
		start(elapsedMs, _elapsed, onReady) {
			events.push(`start:${elapsedMs}`);
			onReady();
		},
		stop() {
			events.push('stop');
		},
		pictureShiftMs() {
			return 0;
		}
	};
}

class LatencyAudioContext {
	static latest: LatencyAudioContext | null = null;
	static created = 0;

	state: AudioContextState = 'running';
	currentTime = 0;
	outputLatency = 0;
	destination = {} as AudioDestinationNode;
	tones: { frequencyHz: number; start: number; stop: number }[] = [];

	constructor() {
		LatencyAudioContext.created += 1;
		LatencyAudioContext.latest = this;
	}

	createOscillator(): OscillatorNode {
		const tone = { frequencyHz: 0, start: 0, stop: 0 };
		this.tones.push(tone);
		return {
			type: 'sine',
			frequency: {
				set value(next: number) {
					tone.frequencyHz = next;
				},
				get value() {
					return tone.frequencyHz;
				}
			},
			connect: () => undefined,
			disconnect: () => undefined,
			addEventListener: () => undefined,
			start: (when = 0) => {
				tone.start = when;
			},
			stop: (when = 0) => {
				tone.stop = when;
			}
		} as unknown as OscillatorNode;
	}

	resume(): Promise<void> {
		this.state = 'running';
		return Promise.resolve();
	}

	suspend(): Promise<void> {
		this.state = 'suspended';
		return Promise.resolve();
	}

	close(): Promise<void> {
		this.state = 'closed';
		return Promise.resolve();
	}
}

describe('live canvas audio', () => {
	const originalAudioContext = window.AudioContext;

	afterEach(() => {
		window.AudioContext = originalAudioContext;
		LatencyAudioContext.latest = null;
		LatencyAudioContext.created = 0;
	});

	function useLatencyContext(): void {
		window.AudioContext = LatencyAudioContext as unknown as typeof AudioContext;
	}

	it('schedules the opening Bip only after outputLatency is reported', () => {
		useLatencyContext();
		const time = manualClock();
		const audio = liveCanvasAudio(time.clock);
		audio.start(
			0,
			() => 0,
			() => undefined
		);
		const started = LatencyAudioContext.latest;
		if (!started) throw new Error('missing audio context');
		started.currentTime = 0.05;
		started.outputLatency = 0.08;
		time.flush();

		const opening = started.tones[0];
		expect(opening?.frequencyHz).toBe(1500);
		expect(opening?.start).toBeCloseTo(0.13);
		expect(opening?.stop).toBeGreaterThan(started.currentTime);
		expect(audio.pictureShiftMs()).toBe(160);
		expect(started.tones).toHaveLength(1);
	});

	it('does not play the opening Bip when playback stops before outputLatency is reported', () => {
		useLatencyContext();
		const time = manualClock();
		const audio = liveCanvasAudio(time.clock);
		audio.start(
			0,
			() => 0,
			() => undefined
		);
		audio.stop();
		const started = LatencyAudioContext.latest;
		if (!started) throw new Error('missing audio context');
		started.outputLatency = 0.08;
		time.flush();

		expect(started.tones).toEqual([]);
		expect(audio.pictureShiftMs()).toBe(0);
	});

	it('suspends one AudioContext on pause and resumes it on the next play', async () => {
		useLatencyContext();
		const time = manualClock();
		const audio = liveCanvasAudio(time.clock);
		audio.start(
			0,
			() => 0,
			() => undefined
		);
		const started = LatencyAudioContext.latest;
		if (!started) throw new Error('missing audio context');
		started.outputLatency = 0.08;
		time.flush();

		audio.stop();
		await Promise.resolve();
		expect(started.state).toBe('suspended');
		expect(LatencyAudioContext.created).toBe(1);

		audio.start(
			1000,
			() => 1000,
			() => undefined
		);
		await Promise.resolve();
		expect(LatencyAudioContext.latest).toBe(started);
		expect(LatencyAudioContext.created).toBe(1);
		expect(started.state).toBe('running');
		audio.dispose?.();
	});
});

describe('canvas playback', () => {
	function playingSession(options?: { maxFrame?: number; picture?: CanvasPicture }) {
		const time = manualClock();
		const audio = recordingAudio();
		const picture = options?.picture ?? createCanvasPicture();
		const session = new PlaybackSession({
			maxFrame: options?.maxFrame,
			fps: BIP_BOP_FPS,
			connect: canvasPlayback(time.clock, audio, picture)
		});
		return { time, audio, picture, session };
	}

	it('counts one animation frame at a time and stops at the last frame', () => {
		const { time, audio, picture, session } = playingSession({ maxFrame: 3 });

		session.setPlaying(true);
		expect(audio.events).toEqual(['stop', 'start:0']);

		time.flush();
		expect(session.frame).toBe(1);
		expect(session.playing).toBe(true);
		expect(picture.clockCentiseconds).toBe(0);
		expect(picture.cycleFraction).toBe(0);
		expect(picture.beat).toBe('bip');
		expect(picture.showBeat).toBe(true);
		expect(picture.previewFps).toBeNull();

		time.advance(500);
		expect(session.frame).toBe(2);
		expect(picture.elapsedSeconds).toBe(0.5);
		expect(picture.clockCentiseconds).toBe(50);
		expect(picture.cycleFraction).toBeCloseTo(0.5);
		expect(picture.showBeat).toBe(false);
		expect(picture.previewFps).toBe(4);

		time.advance(500);
		expect(session.frame).toBe(3);
		expect(session.playing).toBe(false);
		expect(picture.clockCentiseconds).toBe(100);
		expect(picture.cycleFraction).toBe(0);
		expect(picture.beat).toBe('bop');
		expect(picture.showBeat).toBe(true);
		expect(picture.previewFps).toBe(2);
		expect(audio.events.at(-1)).toBe('stop');
	});

	it('moves the frame counter without rebasing the picture clock', () => {
		const { time, audio, picture, session } = playingSession();
		session.setPlaying(true);
		time.flush();
		time.advance(1000);
		expect(session.frame).toBe(2);
		expect(picture.clockCentiseconds).toBe(100);

		session.seek(120);
		expect(session.frame).toBe(120);
		expect(picture.clockCentiseconds).toBe(100);
		expect(audio.events).toEqual(['stop', 'start:0']);

		time.flush();
		expect(session.playing).toBe(true);
		expect(session.frame).toBe(121);
		expect(picture.clockCentiseconds).toBe(100);
		expect(audio.events).toEqual(['stop', 'start:0']);
	});

	it('keeps counting after ten seconds when the session has no length', () => {
		const { time, picture, session } = playingSession();

		session.setPlaying(true);
		time.advance(10_000);
		expect(session.frame).toBe(1);
		expect(picture.clockCentiseconds).toBe(1000);
		expect(session.playing).toBe(true);

		time.advance(1000);
		expect(session.frame).toBe(2);
		expect(picture.clockCentiseconds).toBe(1100);
		expect(picture.previewFps).toBe(2);
		expect(session.playing).toBe(true);
	});

	it('publishes fps from each closed 200ms sample and holds it until the next one closes', () => {
		const { time, picture, session } = playingSession();

		session.setPlaying(true);
		time.flush();
		expect(picture.previewFps).toBeNull();

		time.advance(199);
		expect(picture.previewFps).toBeNull();

		time.advance(1);
		expect(picture.previewFps).toBe(15);

		time.advance(100);
		expect(picture.previewFps).toBe(15);

		time.advance(100);
		expect(picture.previewFps).toBe(10);
	});

	it('continues the picture clock after a pause and drops the paused gap from fps', () => {
		const { time, audio, picture, session } = playingSession();

		session.setPlaying(true);
		time.flush();
		time.advance(200);
		expect(picture.previewFps).toBe(10);
		expect(picture.clockCentiseconds).toBe(20);

		session.setPlaying(false);
		time.advance(5000);
		expect(session.frame).toBe(2);
		expect(picture.previewFps).toBe(10);
		expect(picture.clockCentiseconds).toBe(20);

		session.setPlaying(true);
		expect(audio.events.at(-1)).toBe('start:200');
		time.flush();
		expect(session.frame).toBe(3);
		expect(picture.previewFps).toBe(10);
		expect(picture.clockCentiseconds).toBe(20);

		time.advance(200);
		expect(session.frame).toBe(4);
		expect(picture.previewFps).toBe(10);
		expect(picture.clockCentiseconds).toBe(40);
	});

	it('keeps a paused seek on the frame without starting audio or the clock', () => {
		const { time, audio, picture, session } = playingSession({
			maxFrame: BIP_BOP_MAX_FRAME
		});

		session.seek(120);
		time.advance(1000);

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(120);
		expect(picture.elapsedSeconds).toBe(0);
		expect(picture.clockCentiseconds).toBe(0);
		expect(audio.events).toEqual([]);
	});
});

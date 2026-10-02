import { afterEach, describe, expect, it } from 'vitest';
import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
import type { PlaybackClock } from '$lib/playback/clock';
import { canvasPlayback, liveCanvasAudio, type CanvasAudio } from './canvas-playback';
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

	state: AudioContextState = 'running';
	currentTime = 0;
	outputLatency = 0;
	destination = {} as AudioDestinationNode;
	tones: { frequencyHz: number; start: number; stop: number }[] = [];

	constructor() {
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
});

describe('canvas playback', () => {
	it('advances frames from the clock and stops at ten seconds', () => {
		const time = manualClock();
		const audio = recordingAudio();
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: canvasPlayback(time.clock, audio)
		});

		session.setPlaying(true);
		expect(audio.events).toEqual(['stop', 'start:0']);

		time.flush();
		expect(session.frame).toBe(0);
		expect(session.playing).toBe(true);

		time.advance(1000);
		expect(session.frame).toBe(60);

		time.advance(9000);
		expect(session.frame).toBe(600);
		expect(session.playing).toBe(false);
		expect(audio.events.at(-1)).toBe('stop');
	});

	it('rebases the clock when seeking while playing', () => {
		const time = manualClock();
		const audio = recordingAudio();
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: canvasPlayback(time.clock, audio)
		});
		session.setPlaying(true);
		time.advance(1000);
		expect(session.frame).toBe(60);

		session.seek(120);
		time.flush();

		expect(session.playing).toBe(true);
		expect(session.frame).toBe(120);
		expect(audio.events.at(-1)).toBe('start:2000');
	});

	it('keeps a paused seek on the frame without starting audio', () => {
		const time = manualClock();
		const audio = recordingAudio();
		const session = new PlaybackSession({
			maxFrame: BIP_BOP_MAX_FRAME,
			fps: BIP_BOP_FPS,
			connect: canvasPlayback(time.clock, audio)
		});

		session.seek(120);
		time.advance(1000);

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(120);
		expect(audio.events).toEqual([]);
	});
});

import { describe, expect, it } from 'vitest';
import { PlaybackSession, type PlaybackAdapter, type PlaybackHost } from './PlaybackSession.svelte';

function recordingAdapter(atEnd = false) {
	const events: string[] = [];
	let host: PlaybackHost | undefined;
	const adapter: PlaybackAdapter = {
		start(frame) {
			events.push(`start:${frame}`);
		},
		stop() {
			events.push('stop');
		},
		place(frame) {
			events.push(`place:${frame}`);
		},
		atEnd: () => atEnd,
		dispose() {
			events.push('dispose');
		}
	};
	return {
		events,
		connect(next: PlaybackHost) {
			host = next;
			return adapter;
		},
		advance(frame: number) {
			host?.advance(frame);
		},
		halt() {
			host?.halt();
		}
	};
}

function sessionWith(adapter: ReturnType<typeof recordingAdapter>) {
	return new PlaybackSession({
		maxFrame: 600,
		fps: 60,
		connect: adapter.connect
	});
}

describe('PlaybackSession', () => {
	it('starts playback at the current frame', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);

		session.setPlaying(true);

		expect(session.playing).toBe(true);
		expect(session.frame).toBe(0);
		expect(adapter.events).toEqual(['start:0']);
	});

	it('restarts at frame 0 when play begins at the end', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.seek(600);

		session.setPlaying(true);

		expect(session.frame).toBe(0);
		expect(session.playing).toBe(true);
		expect(adapter.events).toEqual(['place:600', 'start:0']);
	});

	it('restarts at frame 0 when the video has already ended', () => {
		const adapter = recordingAdapter(true);
		const session = sessionWith(adapter);
		session.seek(599);

		session.setPlaying(true);

		expect(session.frame).toBe(0);
		expect(adapter.events).toEqual(['place:599', 'start:0']);
	});

	it('pauses without moving the frame', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);
		adapter.advance(30);

		session.setPlaying(false);

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(30);
		expect(adapter.events.at(-1)).toBe('stop');
	});

	it('seeks while paused and leaves the clock stopped', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);

		session.seek(120.9);

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(120);
		expect(adapter.events).toEqual(['place:120']);
	});

	it('keeps playing when a seek stays inside the timeline', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);

		session.seek(30);

		expect(session.playing).toBe(true);
		expect(session.frame).toBe(30);
		expect(adapter.events).toEqual(['start:0', 'place:30']);
	});

	it('stops when a seek lands on the last frame', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);

		session.seek(900);

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(600);
		expect(adapter.events).toEqual(['start:0', 'stop', 'place:600']);
	});

	it('follows an advancing clock and stops at the last frame', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);

		adapter.advance(45);
		expect(session.frame).toBe(45);
		expect(session.playing).toBe(true);

		adapter.advance(600);
		expect(session.frame).toBe(600);
		expect(session.playing).toBe(false);
		expect(adapter.events.at(-1)).toBe('stop');
	});

	it('treats an external halt as a pause', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);

		adapter.halt();

		expect(session.playing).toBe(false);
		expect(adapter.events.at(-1)).toBe('stop');
	});

	it('keeps playing past the old ten second cap when no length is given', () => {
		const adapter = recordingAdapter();
		const session = new PlaybackSession({
			fps: 60,
			connect: adapter.connect
		});
		session.setPlaying(true);

		adapter.advance(900);

		expect(session.frame).toBe(900);
		expect(session.playing).toBe(true);
		expect(adapter.events).toEqual(['start:0']);
	});

	it('resets to a stopped first frame', () => {
		const adapter = recordingAdapter();
		const session = sessionWith(adapter);
		session.setPlaying(true);
		adapter.advance(80);

		session.reset();

		expect(session.playing).toBe(false);
		expect(session.frame).toBe(0);
		expect(adapter.events.at(-1)).toBe('stop');
	});
});

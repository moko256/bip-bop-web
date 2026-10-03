import { clampFrame } from './time';

/** What an adapter tells the session while time is moving. */
export type PlaybackHost = {
	advance(frame: number): void;
	halt(): void;
};

/**
 * What the session asks an adapter to do.
 * `place` moves the underlying position. While running, the canvas clock rebases
 * and the video element seeks. `atEnd` is true when the video has finished
 * before the frame count says so.
 */
export type PlaybackAdapter = {
	start(frame: number): void;
	stop(): void;
	place(frame: number): void;
	atEnd(): boolean;
	dispose(): void;
};

/** Play, pause, and seek for one Timeline. Canvas and video are adapters behind this. */
export class PlaybackSession {
	playing = $state(false);
	frame = $state(0);
	maxFrame?: number;
	fps: number;
	private readonly adapter: PlaybackAdapter;
	private disposed = false;

	constructor(options: {
		maxFrame?: number;
		fps: number;
		connect: (host: PlaybackHost) => PlaybackAdapter;
	}) {
		this.maxFrame = options.maxFrame;
		this.fps = options.fps;
		this.adapter = options.connect({
			advance: (frame) => this.advance(frame),
			halt: () => this.halt()
		});
	}

	/** Length and rate of the video currently shown in the transport. */
	setTimeline(maxFrame: number, fps: number): void {
		if (this.disposed) return;
		this.maxFrame = maxFrame;
		this.fps = fps;
	}

	setPlaying(next: boolean): void {
		if (this.disposed) return;
		if (!next) {
			this.playing = false;
			this.adapter.stop();
			return;
		}
		if (this.maxFrame !== undefined && (this.frame >= this.maxFrame || this.adapter.atEnd())) {
			this.frame = 0;
		}
		this.playing = true;
		this.adapter.start(this.frame);
	}

	seek(next: number): void {
		if (this.disposed) return;
		const frame = clampFrame(next, this.maxFrame);
		this.frame = frame;
		if (this.maxFrame !== undefined && this.playing && frame >= this.maxFrame) {
			this.playing = false;
			this.adapter.stop();
			this.adapter.place(frame);
			return;
		}
		this.adapter.place(frame);
	}

	/** Drop transport state when a generated video is thrown away. */
	reset(): void {
		if (this.disposed) return;
		this.playing = false;
		this.frame = 0;
		this.adapter.stop();
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.playing = false;
		this.adapter.dispose();
	}

	private advance(frame: number): void {
		if (this.disposed) return;
		const next = clampFrame(frame, this.maxFrame);
		if (next !== this.frame) this.frame = next;
		if (!this.playing || this.maxFrame === undefined || next < this.maxFrame) return;
		this.playing = false;
		this.adapter.stop();
	}

	private halt(): void {
		if (this.disposed || !this.playing) return;
		this.playing = false;
		this.adapter.stop();
	}
}

import { BipBopAudioRenderer, bipBopPreviewPictureMs, planBipBopPreviewCue } from './audio';

/** Delay source shared with the canvas playback clock. */
export type ToneClock = {
	delay(ms: number, callback: () => void): number;
	cancelDelay(id: number): void;
};

/**
 * Cancels the next wait and disconnects the burst already handed to the context.
 * `pictureShiftMs` is how long the picture waits at start.
 */
export type ToneStop = {
	(): void;
	pictureShiftMs: number;
};

/**
 * Bursts on whole seconds of a live AudioContext.
 * The opening burst starts at least `outputLatency` ahead, so the device does
 * not drop it. When that push is needed, `pictureShiftMs` holds the picture
 * until one output lead after the burst: the sound plays, then the video begins.
 * `getElapsed` is the wall-clock media time, the same clock the canvas uses
 * before the picture hold.
 * Returns a stop function that cancels the next wait and disconnects the burst
 * already in the graph. A paused context keeps that burst, and resume would
 * play it together with the burst scheduled for the new play click.
 */
export function scheduleLiveTones(options: {
	context: AudioContext;
	elapsedMs: number;
	getElapsed: () => number;
	clock: ToneClock;
	active: () => boolean;
}): ToneStop {
	let timer = 0;
	let pictureShiftMs = 0;
	let silenceBurst = () => {};
	let startup = true;
	const anchorMs = options.elapsedMs;
	const leadMs = outputLeadMs(options.context);

	const schedule = (pictureMs: number) => {
		if (!options.active()) return;
		if (options.context.state !== 'running') return;
		const cue = planBipBopPreviewCue(pictureMs, leadMs, pictureShiftMs, startup);
		startup = false;
		pictureShiftMs = cue.pictureShiftMs;
		silenceBurst = BipBopAudioRenderer(options.context, cue.delayMs, cue.frequencyHz);
		const wallDelta = Math.max(0, options.getElapsed() - anchorMs);
		const holdRemaining = Math.max(0, pictureShiftMs - wallDelta);
		timer = options.clock.delay(cue.waitMs + holdRemaining, () => {
			const picture = bipBopPreviewPictureMs(options.getElapsed(), pictureShiftMs, anchorMs);
			schedule(picture);
		});
	};
	schedule(options.elapsedMs);

	const stop: ToneStop = Object.assign(
		() => {
			options.clock.cancelDelay(timer);
			timer = 0;
			silenceBurst();
			silenceBurst = () => {};
		},
		{ pictureShiftMs }
	);
	return stop;
}

/** `AudioContext.outputLatency` in milliseconds. Missing or negative reads as 0. */
function outputLeadMs(context: AudioContext): number {
	const latency = context.outputLatency;
	if (typeof latency !== 'number' || !Number.isFinite(latency) || latency <= 0) return 0;
	return latency * 1000;
}

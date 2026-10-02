import { BipBopAudioRenderer, planBipBopTone } from './audio';

/** Delay source shared with the canvas playback clock. */
export type ToneClock = {
	delay(ms: number, callback: () => void): number;
	cancelDelay(id: number): void;
};

/**
 * Bursts on whole seconds of a live AudioContext.
 * Returns a stop function that cancels the next wait.
 */
export function scheduleLiveTones(options: {
	context: AudioContext;
	elapsedMs: number;
	getElapsed: () => number;
	clock: ToneClock;
	active: () => boolean;
}): () => void {
	let timer = 0;
	const schedule = (elapsedMs: number) => {
		if (!options.active()) return;
		if (options.context.state !== 'running') return;
		const plan = planBipBopTone(elapsedMs);
		BipBopAudioRenderer(options.context, plan.delayMs, plan.frequencyHz);
		timer = options.clock.delay(plan.waitMs, () => schedule(options.getElapsed()));
	};
	schedule(options.elapsedMs);
	return () => {
		options.clock.cancelDelay(timer);
		timer = 0;
	};
}

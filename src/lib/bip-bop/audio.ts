/** Even seconds. Matches the `Bip!` label. */
export const BIP_FREQUENCY_HZ = 1500;
/** Odd seconds. Matches the `Bop!` label. */
export const BOP_FREQUENCY_HZ = 475;
/** Length of one sine burst. */
export const BIP_BOP_TONE_MS = 16;
/** Bursts start on whole seconds, in step with the one-second label. */
export const BIP_BOP_TONE_INTERVAL_MS = 1000;
/** Sample rate of tones written into a video. */
export const BIP_BOP_AUDIO_SAMPLE_RATE = 48000;

/**
 * Live preview context, or an offline context when writing a video.
 * The offline context is the audio counterpart of `OffscreenCanvas`.
 */
export type BipBopAudioContext = AudioContext | OfflineAudioContext;

export type BipBopTonePlan = {
	/** Milliseconds from now until the burst starts. Passed to {@link BipBopAudioRenderer}. */
	delayMs: number;
	frequencyHz: number;
	/**
	 * Milliseconds from now until the burst has finished.
	 * The preview waits this long before planning the next second.
	 */
	waitMs: number;
};

/** Even seconds are Bip. Odd seconds are Bop. */
export function bipBopFrequencyHz(second: number): number {
	const index = Math.floor(second);
	return index % 2 === 0 ? BIP_FREQUENCY_HZ : BOP_FREQUENCY_HZ;
}

/**
 * Next burst on the preview clock. `elapsedMs` is the latest `Date` minus the
 * preview's start `Date`. A time that already lands on a whole second uses that
 * second; any later time in the second waits for the next one.
 */
export function planBipBopTone(elapsedMs: number): BipBopTonePlan {
	const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
	const interval = BIP_BOP_TONE_INTERVAL_MS;
	const remainder = elapsed % interval;
	const delayMs = remainder === 0 ? 0 : interval - remainder;
	const second = (elapsed + delayMs) / interval;
	return {
		delayMs,
		frequencyHz: bipBopFrequencyHz(second),
		waitMs: delayMs + BIP_BOP_TONE_MS
	};
}

export type BipBopPreviewCue = {
	/** Milliseconds from now until the graph starts the burst. Never negative. */
	delayMs: number;
	frequencyHz: number;
	/** Milliseconds from now until this burst has finished on the audio clock. */
	waitMs: number;
	/**
	 * Milliseconds the picture stays behind the audio clock.
	 * Grows when part of the output lead was already in the past.
	 */
	pictureShiftMs: number;
};

/**
 * One preview burst, prepared `outputLeadMs` before the picture.
 * `outputLeadMs` is `AudioContext.outputLatency` in milliseconds. The graph
 * starts the burst that early so the device plays it as the matching frame
 * appears. `pictureShiftMs` is lead the picture is already waiting out; lead
 * that would start the burst before now is added there instead.
 * Video export does not use this. An offline context has no output latency.
 */
export function planBipBopPreviewCue(
	elapsedMs: number,
	outputLeadMs: number,
	pictureShiftMs: number
): BipBopPreviewCue {
	const plan = planBipBopTone(elapsedMs);
	const lead = Number.isFinite(outputLeadMs) && outputLeadMs > 0 ? outputLeadMs : 0;
	const shift = Number.isFinite(pictureShiftMs) && pictureShiftMs > 0 ? pictureShiftMs : 0;
	const earlyMs = Math.max(0, lead - shift);
	let delayMs = plan.delayMs - earlyMs;
	let nextShift = shift;
	if (delayMs < 0) {
		nextShift += -delayMs;
		delayMs = 0;
	}
	return {
		delayMs,
		frequencyHz: plan.frequencyHz,
		waitMs: plan.waitMs,
		pictureShiftMs: nextShift
	};
}

/**
 * Picture time for the web preview, in milliseconds.
 * Tones are scheduled on `audioElapsedMs`. `pictureShiftMs` is how long the
 * picture waits behind that clock so a burst already in the graph is heard
 * with its frame. The picture never moves earlier than `earliestMs`.
 */
export function bipBopPreviewPictureMs(
	audioElapsedMs: number,
	pictureShiftMs: number,
	earliestMs: number
): number {
	const audioElapsed = Number.isFinite(audioElapsedMs) ? audioElapsedMs : 0;
	const earliest = Number.isFinite(earliestMs) ? earliestMs : 0;
	const shift = Number.isFinite(pictureShiftMs) && pictureShiftMs > 0 ? pictureShiftMs : 0;
	return Math.max(earliest, audioElapsed - shift);
}

/** Samples in one burst at `sampleRate`. */
export function bipBopToneFrameCount(sampleRate: number): number {
	return Math.round((sampleRate * BIP_BOP_TONE_MS) / 1000);
}

/**
 * Schedules one sine burst on `context`.
 * The burst starts `delayMs` after `context.currentTime` and lasts {@link BIP_BOP_TONE_MS}.
 * The web preview passes how long until the burst should enter the graph, already
 * shifted by output latency. Video writing passes `0`: the burst is the first 16ms
 * of an offline context, and the caller places that buffer on the second it belongs to.
 */
export function BipBopAudioRenderer(
	context: BipBopAudioContext,
	delayMs: number,
	frequencyHz: number
): void {
	const start = context.currentTime + delayMs / 1000;
	const end = start + BIP_BOP_TONE_MS / 1000;
	const oscillator = context.createOscillator();
	oscillator.type = 'sine';
	oscillator.frequency.value = frequencyHz;
	oscillator.connect(context.destination);
	oscillator.addEventListener(
		'ended',
		() => {
			oscillator.disconnect();
		},
		{ once: true }
	);
	oscillator.start(start);
	oscillator.stop(end);
}

import { beatAtSecond, type PictureBeat } from './media-time';

/** Even seconds. Matches the `Bip!` label. */
export const BIP_FREQUENCY_HZ = 1500;
/** Odd seconds. Matches the `Bop!` label. */
export const BOP_FREQUENCY_HZ = 475;
/**
 * Nominal length of one sine burst.
 * The sounding length is the whole number of cycles nearest to this, so a
 * burst ends where its sine crosses zero instead of mid-cycle.
 * Bip is exactly 24 cycles in 16ms. Bop is 8 cycles, about 16.84ms.
 */
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

/** Hertz for a Bip or Bop label. */
export function frequencyHzForBeat(beat: PictureBeat): number {
	return beat === 'bip' ? BIP_FREQUENCY_HZ : BOP_FREQUENCY_HZ;
}

/** Hertz for the beat on `second`. Even seconds are Bip. Odd seconds are Bop. */
export function bipBopFrequencyHz(second: number): number {
	return frequencyHzForBeat(beatAtSecond(second));
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
	const frequencyHz = bipBopFrequencyHz(second);
	return {
		delayMs,
		frequencyHz,
		waitMs: delayMs + bipBopToneDurationMs(frequencyHz)
	};
}

/** Whole cycles nearest to {@link BIP_BOP_TONE_MS} at `frequencyHz`. */
export function bipBopToneCycles(frequencyHz: number): number {
	if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return 1;
	return Math.max(1, Math.round((frequencyHz * BIP_BOP_TONE_MS) / 1000));
}

/**
 * Sounding length of one burst in milliseconds.
 * A whole number of cycles at `frequencyHz`, so the sine starts and ends
 * on a zero crossing.
 */
export function bipBopToneDurationMs(frequencyHz: number): number {
	if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return BIP_BOP_TONE_MS;
	return (bipBopToneCycles(frequencyHz) * 1000) / frequencyHz;
}

export type BipBopPreviewCue = {
	/** Milliseconds from now until the graph starts the burst. Never sooner than the output lead. */
	delayMs: number;
	frequencyHz: number;
	/** Milliseconds from now until this burst's second has finished on the preview clock. */
	waitMs: number;
	/**
	 * Milliseconds the picture waits at playback start.
	 * The opening burst plays, then the video begins one output lead later.
	 */
	pictureShiftMs: number;
};

/**
 * One preview burst.
 * `outputLeadMs` is `AudioContext.outputLatency` in milliseconds. A burst
 * scheduled at the current instant is dropped, so the graph start is at least
 * that far ahead. On `startup`, if the burst had to be pushed out to that
 * horizon, the picture waits until one output lead after the burst starts:
 * the sound plays, then the video begins.
 * Later calls keep the picture shift already chosen.
 * Video export does not use this. An offline context has no output latency.
 */
export function planBipBopPreviewCue(
	elapsedMs: number,
	outputLeadMs: number,
	pictureShiftMs: number,
	startup = false
): BipBopPreviewCue {
	const plan = planBipBopTone(elapsedMs);
	const lead = Number.isFinite(outputLeadMs) && outputLeadMs > 0 ? outputLeadMs : 0;
	const shift = Number.isFinite(pictureShiftMs) && pictureShiftMs > 0 ? pictureShiftMs : 0;
	const synced = plan.delayMs - lead;
	const delayMs = Math.max(lead, synced);
	let nextShift = shift;
	if (startup && synced < lead) {
		nextShift = Math.max(shift, lead + lead - plan.delayMs);
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
 * `audioElapsedMs` runs from the play click. `pictureShiftMs` holds the
 * picture at `earliestMs` while the opening burst plays; the video then
 * starts. The picture never moves earlier than `earliestMs`.
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

/**
 * Samples in one burst at `sampleRate`.
 * Covers every sample the oscillator sounds, including the last one before
 * it stops on a zero crossing.
 */
export function bipBopToneFrameCount(sampleRate: number, frequencyHz: number): number {
	if (!Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
	if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) {
		return Math.round((sampleRate * BIP_BOP_TONE_MS) / 1000);
	}
	const sounding = (sampleRate * bipBopToneCycles(frequencyHz)) / frequencyHz;
	return Math.max(1, Math.ceil(sounding - 1e-6));
}

/**
 * Schedules one sine burst on `context`.
 * The burst starts `delayMs` after `context.currentTime` and sounds for
 * {@link bipBopToneDurationMs}: a whole number of cycles at `frequencyHz`.
 * The web preview passes how long until the burst should enter the graph, already
 * shifted by output latency. Video writing passes `0`: the burst fills an
 * offline context, and the caller places that buffer on the second it belongs to.
 * The returned function disconnects the burst. Pause uses it so a burst already
 * queued for a later second does not play again when playback resumes.
 */
export function BipBopAudioRenderer(
	context: BipBopAudioContext,
	delayMs: number,
	frequencyHz: number
): () => void {
	const start = context.currentTime + delayMs / 1000;
	const end = start + bipBopToneDurationMs(frequencyHz) / 1000;
	const oscillator = context.createOscillator();
	oscillator.type = 'sine';
	oscillator.frequency.value = frequencyHz;
	oscillator.connect(context.destination);
	let silenced = false;
	const silence = () => {
		if (silenced) return;
		silenced = true;
		oscillator.disconnect();
	};
	oscillator.addEventListener('ended', silence, { once: true });
	oscillator.start(start);
	oscillator.stop(end);
	return silence;
}

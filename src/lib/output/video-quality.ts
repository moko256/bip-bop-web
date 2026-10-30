import { Quality, type QualityLevel } from 'mediabunny';

/** Mediabunny quality names, highest first. Shown as these strings. */
export const videoQualityLevels = [
	'very-high',
	'high',
	'medium',
	'low',
	'very-low'
] as const satisfies readonly QualityLevel[];

export type VideoQualityLevel = (typeof videoQualityLevels)[number];

export const defaultVideoQuality: VideoQualityLevel = 'high';

/**
 * Mediabunny `Quality` for one UI level, as used for every generated video.
 *
 * The rate-control choices are pinned instead of left to mediabunny
 * defaults, after measuring this picture (flat fields on a 2s cycle,
 * moving text, a 1-frame tone trace each second) in Chromium:
 * - Quantizer-based encoding stays preferred (`preferBitrate: false`).
 *   Forcing bitrate mode (`preferBitrate: true`) never won at any
 *   resolution: at 1920×1080 the generic bitrate it targets made VP9 and
 *   AV1 files larger than quantizer `high` at the same PSNR, and explicit
 *   quantitative `bitrate` values are the same knob with the same result.
 * - When encoding does fall back to bitrate (VP8, or AVC where the
 *   quantizer candidate is rejected), `variable` is required: `constant`
 *   produced files 20–46% larger at equal or worse PSNR, because it must
 *   spend the same rate on near-lossless flat frames as on the trace and
 *   text frames.
 * - Quantitative `quantizer` values were not adopted: they duplicate the
 *   qualitative scale where supported (qualitative levels already map to
 *   quantizers per codec), an out-of-range value throws unless a bitrate
 *   fallback is also given (AVC QP 47 throws in Chromium), past the
 *   qualitative worst value the rate-distortion trade collapsed, and the
 *   VP9 quantizer scale changed at Chromium 145, so a hardcoded value is
 *   not portable.
 * Lowering the level itself remains the only size lever here, and it is
 * cheap for this content — `high` to `medium` saved about 27% for VP9 and
 * AV1 at 1280×720 and 1920×1080 with global PSNR down about 0.1 dB — but
 * that is the user's quality choice in the UI, not an encoding gain, so
 * the level mapping and the `high` default are unchanged.
 */
export function createVideoQuality(level: VideoQualityLevel): Quality {
	return new Quality({ quality: level, preferBitrate: false, bitrateMode: 'variable' });
}

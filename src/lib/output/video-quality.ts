import type { QualityLevel } from 'mediabunny';

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

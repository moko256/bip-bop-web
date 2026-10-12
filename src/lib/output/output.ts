import {
	defaultResolution,
	resolutionCatalog,
	resolutionGroups,
	resolutions,
	type Resolution,
	type ResolutionGroup
} from './resolution-catalog';

export {
	defaultResolution,
	resolutionCatalog,
	resolutionGroups,
	resolutions,
	type Resolution,
	type ResolutionGroup
};

export const outputTypes = ['page', 'fullscreen-url', 'mp4', 'webm'] as const;

export type OutputType = (typeof outputTypes)[number];

export const outputCategories = ['page', 'video', 'fullscreen-url'] as const;

export type OutputCategory = (typeof outputCategories)[number];

const categoryByOutputType = {
	page: 'page',
	mp4: 'video',
	webm: 'video',
	'fullscreen-url': 'fullscreen-url'
} as const satisfies Record<OutputType, OutputCategory>;

export function outputCategory(type: OutputType): OutputCategory {
	return categoryByOutputType[type];
}

export type VideoOutputType = Extract<OutputType, 'mp4' | 'webm'>;

export function isVideoOutputType(type: OutputType): type is VideoOutputType {
	return outputCategory(type) === 'video';
}

const resolutionByValue = new Map(resolutionCatalog.map((entry) => [entry.value, entry] as const));

/** Both sides of a resolution bitmap are at most this many pixels. */
export const RESOLUTION_SIDE_LIMIT = 8000;

export type ResolutionBitmap = {
	width: number;
	height: number;
};

/**
 * Read `widthxheight`.
 * Each side is an integer from 1 through {@link RESOLUTION_SIDE_LIMIT}.
 * Anything else, including a missing value, is not a bitmap. The catalog and a
 * fullscreen URL both use this rule, so a catalog value the URL would drop
 * cannot be selected.
 */
export function parseResolutionBitmap(value: string | null): ResolutionBitmap | null {
	if (value === null) return null;
	const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(value);
	if (!match) return null;
	const width = Number(match[1]);
	const height = Number(match[2]);
	if (width > RESOLUTION_SIDE_LIMIT || height > RESOLUTION_SIDE_LIMIT) return null;
	return { width, height };
}

export function resolutionPixelLabel(value: Resolution): string {
	const entry = resolutionByValue.get(value);
	if (!entry) return '';
	return entry.pixelLabel;
}

export function parseResolution(value: Resolution): ResolutionBitmap {
	const entry = resolutionByValue.get(value);
	const bitmap = parseResolutionBitmap(value);
	if (!entry || !bitmap) throw new Error(`Unknown resolution: ${value}`);
	return bitmap;
}

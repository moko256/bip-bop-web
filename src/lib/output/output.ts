import * as m from '$lib/paraglide/messages';

export const outputTypes = ['page', 'mp4', 'webm', 'fullscreen-url'] as const;

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

export function outputTypeLabel(type: OutputType): string {
	switch (type) {
		case 'page':
			return m.output_type_page();
		case 'mp4':
			return 'mp4';
		case 'webm':
			return 'webm';
		case 'fullscreen-url':
			return m.output_type_fullscreen_url();
	}
}

/** Landscape sizes from the computer-graphics table on Wikipedia's list of common resolutions. */
const resolutionSizes = [
	[3840, 2160],
	[3200, 1800],
	[2560, 1440],
	[2048, 1152],
	[1920, 1080],
	[1600, 900],
	[1440, 1080],
	[1280, 720],
	[3200, 2048],
	[2048, 1280],
	[2560, 1600],
	[1920, 1200],
	[1680, 1050],
	[1600, 1024],
	[1440, 900],
	[1280, 800],
	[1280, 768],
	[1920, 1280],
	[1440, 960],
	[2560, 2048],
	[2560, 1920],
	[2048, 1536],
	[1920, 1440],
	[1600, 1200],
	[1400, 1050],
	[1280, 1024],
	[1024, 768],
	[800, 600],
	[640, 480],
	[320, 240],
	[3840, 1600],
	[3440, 1440],
	[2560, 1080]
] as const;

function gcd(a: number, b: number): number {
	let x = a;
	let y = b;
	while (y !== 0) {
		const next = x % y;
		x = y;
		y = next;
	}
	return x;
}

const SIXTEEN_BY_NINE = 16 / 9;
const SIXTEEN_BY_TEN = 16 / 10;
const FOUR_BY_THREE = 4 / 3;
const ASPECT_EPSILON = 1e-4;

function aspectRatioLabel(width: number, height: number): string {
	const g = gcd(width, height);
	return `${width / g}:${height / g}`;
}

function isUltrawide(width: number, height: number): boolean {
	return width / height > SIXTEEN_BY_NINE;
}

function matchesAspect(width: number, height: number, ratio: number): boolean {
	return Math.abs(width / height - ratio) < ASPECT_EPSILON;
}

function resolutionGroupLabel(width: number, height: number): string {
	if (isUltrawide(width, height)) return m.resolution_aspect_ultrawide();
	if (matchesAspect(width, height, SIXTEEN_BY_NINE)) return '16:9';
	if (matchesAspect(width, height, SIXTEEN_BY_TEN)) return '16:10';
	if (matchesAspect(width, height, FOUR_BY_THREE)) return '4:3';
	return aspectRatioLabel(width, height);
}

/** Lower sorts earlier; ultrawide groups are always last. */
function resolutionGroupSortKey(width: number, height: number): number {
	if (isUltrawide(width, height)) return 1_000_000;
	const ratio = width / height;
	if (matchesAspect(width, height, SIXTEEN_BY_NINE)) return 0;
	if (matchesAspect(width, height, SIXTEEN_BY_TEN)) return 10_000;
	if (matchesAspect(width, height, FOUR_BY_THREE)) return 20_000;
	if (ratio > SIXTEEN_BY_TEN) return 5_000 - Math.round(ratio * 1_000);
	if (ratio > FOUR_BY_THREE) return 15_000 - Math.round(ratio * 1_000);
	return 25_000 - Math.round(ratio * 1_000);
}

function resolutionGroupId(width: number, height: number): string {
	if (isUltrawide(width, height)) return 'ultrawide';
	return resolutionGroupLabel(width, height);
}

export type Resolution = `${number}x${number}`;

export const defaultResolution: Resolution = '1920x1080';

const resolutionValues = resolutionSizes.map(
	([width, height]) => `${width}x${height}` as Resolution
);

export function resolutionPixelLabel(value: Resolution): string {
	const { width, height } = parseResolution(value);
	return `${width}×${height}`;
}

export type ResolutionGroup = {
	id: string;
	label: string;
	options: readonly { value: Resolution; label: string }[];
};

function buildResolutionGroups(): ResolutionGroup[] {
	const byGroup = new Map<
		string,
		{ id: string; label: string; sortKey: number; options: { value: Resolution; label: string }[] }
	>();

	for (const [width, height] of resolutionSizes) {
		const value = `${width}x${height}` as Resolution;
		const groupLabel = resolutionGroupLabel(width, height);
		const id = resolutionGroupId(width, height);
		const sortKey = resolutionGroupSortKey(width, height);
		const entry = byGroup.get(id) ?? { id, label: groupLabel, sortKey, options: [] };
		entry.options.push({ value, label: resolutionPixelLabel(value) });
		byGroup.set(id, entry);
	}

	return [...byGroup.values()]
		.sort((a, b) => a.sortKey - b.sortKey || a.label.localeCompare(b.label))
		.map((group) => ({
			id: group.id,
			label: group.label,
			options: [...group.options].sort(
				(a, b) =>
					parseResolution(b.value).width * parseResolution(b.value).height -
					parseResolution(a.value).width * parseResolution(a.value).height
			)
		}));
}

export const resolutionGroups = buildResolutionGroups();

/** Flat list of resolutions in the same order as the grouped select. */
export const resolutions = resolutionGroups.flatMap((group) => group.options);

export function parseResolution(value: Resolution): { width: number; height: number } {
	const match = /^(\d+)x(\d+)$/.exec(value);
	if (!match) throw new Error(m.error_unknown_resolution({ value }));
	const width = Number(match[1]);
	const height = Number(match[2]);
	if (!resolutionValues.includes(value)) {
		throw new Error(m.error_unknown_resolution({ value }));
	}
	return { width, height };
}

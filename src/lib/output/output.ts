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

function aspectRatioLabel(width: number, height: number): string {
	const g = gcd(width, height);
	return `${width / g}:${height / g}`;
}

/** Lower sorts earlier; ratios wider than 16:9 are always after the rest. */
function resolutionGroupSortKey(width: number, height: number): number {
	const ratio = width / height;
	if (ratio > SIXTEEN_BY_NINE) {
		return 1_000_000 - Math.round(ratio * 10_000);
	}
	return -Math.round(ratio * 10_000);
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
		const id = aspectRatioLabel(width, height);
		const sortKey = resolutionGroupSortKey(width, height);
		const entry = byGroup.get(id) ?? { id, label: id, sortKey, options: [] };
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

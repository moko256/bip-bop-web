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

type ResolutionCatalogEntry = {
	value: `${number}x${number}`;
	width: number;
	height: number;
	pixels: number;
	pixelLabel: string;
	aspectRatio: string;
	aspectRatioValue: number;
	groupSortKey: number;
};

/**
 * Landscape sizes from the computer-graphics table on Wikipedia's list of common
 * resolutions. Aspect ratios and group sort keys are precomputed (no runtime GCD).
 */
const resolutionCatalog = [
	{
		value: '3840x2160',
		width: 3840,
		height: 2160,
		pixels: 8_294_400,
		pixelLabel: '3840×2160',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '3200x1800',
		width: 3200,
		height: 1800,
		pixels: 5_760_000,
		pixelLabel: '3200×1800',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '2560x1440',
		width: 2560,
		height: 1440,
		pixels: 3_686_400,
		pixelLabel: '2560×1440',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '2048x1152',
		width: 2048,
		height: 1152,
		pixels: 2_359_296,
		pixelLabel: '2048×1152',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '1920x1080',
		width: 1920,
		height: 1080,
		pixels: 2_073_600,
		pixelLabel: '1920×1080',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '1600x900',
		width: 1600,
		height: 900,
		pixels: 1_440_000,
		pixelLabel: '1600×900',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '1440x1080',
		width: 1440,
		height: 1080,
		pixels: 1_555_200,
		pixelLabel: '1440×1080',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '1280x720',
		width: 1280,
		height: 720,
		pixels: 921_600,
		pixelLabel: '1280×720',
		aspectRatio: '16:9',
		aspectRatioValue: 16 / 9,
		groupSortKey: -17_778
	},
	{
		value: '3200x2048',
		width: 3200,
		height: 2048,
		pixels: 6_553_600,
		pixelLabel: '3200×2048',
		aspectRatio: '25:16',
		aspectRatioValue: 25 / 16,
		groupSortKey: -15_625
	},
	{
		value: '2048x1280',
		width: 2048,
		height: 1280,
		pixels: 2_621_440,
		pixelLabel: '2048×1280',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '2560x1600',
		width: 2560,
		height: 1600,
		pixels: 4_096_000,
		pixelLabel: '2560×1600',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '1920x1200',
		width: 1920,
		height: 1200,
		pixels: 2_304_000,
		pixelLabel: '1920×1200',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '1680x1050',
		width: 1680,
		height: 1050,
		pixels: 1_764_000,
		pixelLabel: '1680×1050',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '1600x1024',
		width: 1600,
		height: 1024,
		pixels: 1_638_400,
		pixelLabel: '1600×1024',
		aspectRatio: '25:16',
		aspectRatioValue: 25 / 16,
		groupSortKey: -15_625
	},
	{
		value: '1440x900',
		width: 1440,
		height: 900,
		pixels: 1_296_000,
		pixelLabel: '1440×900',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '1280x800',
		width: 1280,
		height: 800,
		pixels: 1_024_000,
		pixelLabel: '1280×800',
		aspectRatio: '8:5',
		aspectRatioValue: 8 / 5,
		groupSortKey: -16_000
	},
	{
		value: '1280x768',
		width: 1280,
		height: 768,
		pixels: 983_040,
		pixelLabel: '1280×768',
		aspectRatio: '5:3',
		aspectRatioValue: 5 / 3,
		groupSortKey: -16_667
	},
	{
		value: '1920x1280',
		width: 1920,
		height: 1280,
		pixels: 2_457_600,
		pixelLabel: '1920×1280',
		aspectRatio: '3:2',
		aspectRatioValue: 3 / 2,
		groupSortKey: -15_000
	},
	{
		value: '1440x960',
		width: 1440,
		height: 960,
		pixels: 1_382_400,
		pixelLabel: '1440×960',
		aspectRatio: '3:2',
		aspectRatioValue: 3 / 2,
		groupSortKey: -15_000
	},
	{
		value: '2560x2048',
		width: 2560,
		height: 2048,
		pixels: 5_242_880,
		pixelLabel: '2560×2048',
		aspectRatio: '5:4',
		aspectRatioValue: 5 / 4,
		groupSortKey: -12_500
	},
	{
		value: '2560x1920',
		width: 2560,
		height: 1920,
		pixels: 4_915_200,
		pixelLabel: '2560×1920',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '2048x1536',
		width: 2048,
		height: 1536,
		pixels: 3_145_728,
		pixelLabel: '2048×1536',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '1920x1440',
		width: 1920,
		height: 1440,
		pixels: 2_764_800,
		pixelLabel: '1920×1440',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '1600x1200',
		width: 1600,
		height: 1200,
		pixels: 1_920_000,
		pixelLabel: '1600×1200',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '1400x1050',
		width: 1400,
		height: 1050,
		pixels: 1_470_000,
		pixelLabel: '1400×1050',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '1280x1024',
		width: 1280,
		height: 1024,
		pixels: 1_310_720,
		pixelLabel: '1280×1024',
		aspectRatio: '5:4',
		aspectRatioValue: 5 / 4,
		groupSortKey: -12_500
	},
	{
		value: '1024x768',
		width: 1024,
		height: 768,
		pixels: 786_432,
		pixelLabel: '1024×768',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '800x600',
		width: 800,
		height: 600,
		pixels: 480_000,
		pixelLabel: '800×600',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '640x480',
		width: 640,
		height: 480,
		pixels: 307_200,
		pixelLabel: '640×480',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '320x240',
		width: 320,
		height: 240,
		pixels: 76_800,
		pixelLabel: '320×240',
		aspectRatio: '4:3',
		aspectRatioValue: 4 / 3,
		groupSortKey: -13_333
	},
	{
		value: '3840x1600',
		width: 3840,
		height: 1600,
		pixels: 6_144_000,
		pixelLabel: '3840×1600',
		aspectRatio: '12:5',
		aspectRatioValue: 12 / 5,
		groupSortKey: 976_000
	},
	{
		value: '3440x1440',
		width: 3440,
		height: 1440,
		pixels: 4_953_600,
		pixelLabel: '3440×1440',
		aspectRatio: '43:18',
		aspectRatioValue: 43 / 18,
		groupSortKey: 976_111
	},
	{
		value: '2560x1080',
		width: 2560,
		height: 1080,
		pixels: 2_764_800,
		pixelLabel: '2560×1080',
		aspectRatio: '64:27',
		aspectRatioValue: 64 / 27,
		groupSortKey: 976_296
	}
] as const satisfies readonly ResolutionCatalogEntry[];

export type Resolution = (typeof resolutionCatalog)[number]['value'];

export const defaultResolution: Resolution = '1920x1080';

const resolutionByValue = new Map(
	resolutionCatalog.map((entry) => [entry.value, entry] as const)
);

export function resolutionPixelLabel(value: Resolution): string {
	return resolutionByValue.get(value)?.pixelLabel ?? '';
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

	for (const entry of resolutionCatalog) {
		const id = entry.aspectRatio;
		const group = byGroup.get(id) ?? {
			id,
			label: id,
			sortKey: entry.groupSortKey,
			options: []
		};
		group.options.push({ value: entry.value, label: entry.pixelLabel });
		byGroup.set(id, group);
	}

	return [...byGroup.values()]
		.sort((a, b) => a.sortKey - b.sortKey || a.label.localeCompare(b.label))
		.map((group) => ({
			id: group.id,
			label: group.label,
			options: [...group.options].sort((a, b) => {
				const pixelsA = resolutionByValue.get(a.value)!.pixels;
				const pixelsB = resolutionByValue.get(b.value)!.pixels;
				return pixelsB - pixelsA;
			})
		}));
}

export const resolutionGroups = buildResolutionGroups();

/** Flat list of resolutions in the same order as the grouped select. */
export const resolutions = resolutionGroups.flatMap((group) => group.options);

export function parseResolution(value: Resolution): { width: number; height: number } {
	const entry = resolutionByValue.get(value);
	if (!entry) throw new Error(m.error_unknown_resolution({ value }));
	return { width: entry.width, height: entry.height };
}

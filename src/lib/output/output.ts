import * as m from '$lib/paraglide/messages';
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

const resolutionByValue = new Map(resolutionCatalog.map((entry) => [entry.value, entry] as const));

export function resolutionPixelLabel(value: Resolution): string {
	const entry = resolutionByValue.get(value);
	if (!entry) return '';
	return entry.pixelLabel;
}

export function parseResolution(value: Resolution): { width: number; height: number } {
	const entry = resolutionByValue.get(value);
	if (!entry) throw new Error(m.error_unknown_resolution({ value }));
	return { width: entry.width, height: entry.height };
}

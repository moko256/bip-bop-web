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

export const outputTypeLabels: Record<OutputType, string> = {
	page: 'ページ',
	mp4: 'mp4',
	webm: 'webm',
	'fullscreen-url': 'フルスクリーンURL'
};

export const resolutions = [
	{ value: '1920x1080', label: '1920x1080' },
	{ value: '720x480', label: '720×480' }
] as const;

export const videoCodecs = ['h264'] as const;

export const audioCodecs = ['aac'] as const;

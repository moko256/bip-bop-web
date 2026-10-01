import {
	Mp4OutputFormat,
	WebMOutputFormat,
	type AudioCodec,
	type OutputFormat,
	type VideoCodec
} from 'mediabunny';

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

export function videoOutputFormat(type: VideoOutputType): OutputFormat {
	switch (type) {
		case 'mp4':
			return new Mp4OutputFormat();
		case 'webm':
			return new WebMOutputFormat();
	}
}

export function supportedVideoCodecs(type: VideoOutputType): VideoCodec[] {
	return videoOutputFormat(type).getSupportedVideoCodecs();
}

export function supportedAudioCodecs(type: VideoOutputType): AudioCodec[] {
	return videoOutputFormat(type).getSupportedAudioCodecs();
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

export type Resolution = (typeof resolutions)[number]['value'];

export function parseResolution(value: Resolution): { width: number; height: number } {
	const match = /^(\d+)x(\d+)$/.exec(value);
	if (!match) throw new Error(`未知の解像度です: ${value}`);
	return { width: Number(match[1]), height: Number(match[2]) };
}

import {
	Mp4OutputFormat,
	WebMOutputFormat,
	type AudioCodec,
	type OutputFormat,
	type VideoCodec
} from 'mediabunny';
import type { VideoOutputType } from './output';

export function videoOutputFormat(type: VideoOutputType): OutputFormat {
	switch (type) {
		case 'mp4':
			return new Mp4OutputFormat();
		case 'webm':
			return new WebMOutputFormat();
	}
}

const mp4VideoCodecOrder = [
	'avc',
	'hevc',
	'av1',
	'vp9',
	'vp8'
] as const satisfies readonly VideoCodec[];
const mp4AudioCodecOrder = [
	'aac',
	'mp3',
	'opus',
	'vorbis'
] as const satisfies readonly AudioCodec[];
const webmVideoCodecOrder = ['av1', 'vp9', 'vp8'] as const satisfies readonly VideoCodec[];
const webmAudioCodecOrder = ['opus', 'vorbis'] as const satisfies readonly AudioCodec[];

function sortCodecsByPreference<T extends string>(codecs: T[], preference: readonly T[]): T[] {
	const rank = new Map(preference.map((codec, index) => [codec, index]));
	const preferred: T[] = [];
	const rest: T[] = [];
	for (const codec of codecs) {
		if (rank.has(codec)) preferred.push(codec);
		else rest.push(codec);
	}
	preferred.sort((left, right) => rank.get(left)! - rank.get(right)!);
	return [...preferred, ...rest];
}

export function supportedVideoCodecs(type: VideoOutputType): VideoCodec[] {
	const codecs = videoOutputFormat(type).getSupportedVideoCodecs();
	switch (type) {
		case 'mp4':
			return sortCodecsByPreference(codecs, mp4VideoCodecOrder);
		case 'webm':
			return sortCodecsByPreference(codecs, webmVideoCodecOrder);
	}
}

export function supportedAudioCodecs(type: VideoOutputType): AudioCodec[] {
	const codecs = videoOutputFormat(type).getSupportedAudioCodecs();
	switch (type) {
		case 'mp4':
			return sortCodecsByPreference(codecs, mp4AudioCodecOrder);
		case 'webm':
			return sortCodecsByPreference(codecs, webmAudioCodecOrder);
	}
}

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

export function supportedVideoCodecs(type: VideoOutputType): VideoCodec[] {
	return videoOutputFormat(type).getSupportedVideoCodecs();
}

export function supportedAudioCodecs(type: VideoOutputType): AudioCodec[] {
	return videoOutputFormat(type).getSupportedAudioCodecs();
}

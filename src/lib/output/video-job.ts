import type { VideoCodec } from 'mediabunny';
import type { VideoOutputType } from './output';

/** One sine burst, already rendered. The worker places it at `second`. */
export type VideoTone = {
	second: number;
	sampleRate: number;
	samples: Float32Array;
};

export type VideoEncodeRequest = {
	kind: 'generate';
	id: number;
	outputType: VideoOutputType;
	codec: VideoCodec;
	width: number;
	height: number;
	frameCount: number;
	tones: VideoTone[];
};

export type VideoAbortRequest = {
	kind: 'abort';
	id: number;
};

export type VideoWorkerRequest = VideoEncodeRequest | VideoAbortRequest;

export type VideoEncodeSuccess = {
	id: number;
	ok: true;
	mimeType: string;
	buffer: ArrayBuffer;
};

export type VideoEncodeFailure = {
	id: number;
	ok: false;
	name: string;
	message: string;
};

export type VideoWorkerResponse = VideoEncodeSuccess | VideoEncodeFailure;

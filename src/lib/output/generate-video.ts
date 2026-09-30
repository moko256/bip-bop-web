import {
	BIP_BOP_AUDIO_SAMPLE_RATE,
	BipBopAudioRenderer,
	bipBopFrequencyHz,
	bipBopToneFrameCount
} from '$lib/bip-bop/audio';
import type { VideoCodec } from 'mediabunny';
import { parseResolution, type Resolution, type VideoOutputType } from './output';
import type { VideoTone, VideoWorkerRequest, VideoWorkerResponse } from './video-job';
import { VIDEO_DURATION_SECONDS, VIDEO_FPS } from './video-timing';

export { VIDEO_DURATION_SECONDS, VIDEO_FPS };

/**
 * Encodes the Bip-Bop picture and tone.
 * Drawing and muxing run in a worker. Each tone is rendered on this thread:
 * a worker has no `OfflineAudioContext`, and the preview and the file share
 * {@link BipBopAudioRenderer}.
 */
export async function generateBipBopVideo(options: {
	outputType: VideoOutputType;
	codec: VideoCodec;
	width: number;
	height: number;
	frameCount?: number;
	signal?: AbortSignal;
}): Promise<Blob> {
	if (options.signal?.aborted) throw aborted();
	const frameCount = options.frameCount ?? VIDEO_FPS * VIDEO_DURATION_SECONDS;
	const tones = await renderBipBopTones(frameCount, options.signal);
	if (options.signal?.aborted) throw aborted();

	const { buffer, mimeType } = await encodeInWorker(
		{
			kind: 'generate',
			outputType: options.outputType,
			codec: options.codec,
			width: options.width,
			height: options.height,
			frameCount,
			tones
		},
		options.signal
	);
	if (options.signal?.aborted) throw aborted();
	return new Blob([buffer], { type: mimeType });
}

export async function generatePlayback(options: {
	outputType: VideoOutputType;
	codec: VideoCodec;
	resolution: Resolution;
	signal?: AbortSignal;
}): Promise<string> {
	const { width, height } = parseResolution(options.resolution);
	const blob = await generateBipBopVideo({
		outputType: options.outputType,
		codec: options.codec,
		width,
		height,
		signal: options.signal
	});
	if (options.signal?.aborted) throw aborted();
	const url = URL.createObjectURL(blob);
	if (options.signal?.aborted) {
		URL.revokeObjectURL(url);
		throw aborted();
	}
	options.signal?.addEventListener('abort', () => URL.revokeObjectURL(url), { once: true });
	return url;
}

/**
 * Renders one burst at the start of an offline context (0ms from `currentTime`).
 * The worker places the samples on `second`.
 */
async function renderBipBopTone(second: number): Promise<VideoTone> {
	const length = bipBopToneFrameCount(BIP_BOP_AUDIO_SAMPLE_RATE);
	const context = new OfflineAudioContext(1, length, BIP_BOP_AUDIO_SAMPLE_RATE);
	BipBopAudioRenderer(context, 0, bipBopFrequencyHz(second));
	const buffer = await context.startRendering();
	return {
		second,
		sampleRate: buffer.sampleRate,
		samples: new Float32Array(buffer.getChannelData(0))
	};
}

async function renderBipBopTones(frameCount: number, signal?: AbortSignal): Promise<VideoTone[]> {
	const tones: VideoTone[] = [];
	for (let frame = 0; frame < frameCount; frame += VIDEO_FPS) {
		if (signal?.aborted) throw aborted();
		tones.push(await renderBipBopTone(frame / VIDEO_FPS));
	}
	return tones;
}

type PendingJob = {
	resolve: (result: { mimeType: string; buffer: ArrayBuffer }) => void;
	reject: (error: unknown) => void;
	onAbort: () => void;
	signal?: AbortSignal;
};

let videoWorker: Worker | undefined;
let nextJobId = 1;
const pendingJobs = new Map<number, PendingJob>();

function encodeInWorker(
	request: Omit<Extract<VideoWorkerRequest, { kind: 'generate' }>, 'id'>,
	signal?: AbortSignal
): Promise<{ mimeType: string; buffer: ArrayBuffer }> {
	if (signal?.aborted) return Promise.reject(aborted());
	const id = nextJobId;
	nextJobId += 1;
	const current = worker();
	const jobRequest = { ...request, id };

	return new Promise((resolve, reject) => {
		const onAbort = () => {
			try {
				current.postMessage({ kind: 'abort', id } satisfies VideoWorkerRequest);
			} catch {
				// The worker is already gone.
			}
			finish(id, (job) => job.reject(aborted()));
		};
		pendingJobs.set(id, { resolve, reject, onAbort, signal });
		signal?.addEventListener('abort', onAbort, { once: true });
		try {
			current.postMessage(jobRequest satisfies VideoWorkerRequest, toneBuffers(request.tones));
		} catch (error) {
			finish(id, (job) => job.reject(error));
		}
	});
}

function worker(): Worker {
	if (videoWorker) return videoWorker;
	const created = new Worker(new URL('./generate-video.worker.ts', import.meta.url), {
		type: 'module',
		name: 'bip-bop-video'
	});
	created.onmessage = (event: MessageEvent<VideoWorkerResponse>) => {
		deliver(event.data);
	};
	created.onerror = (event) => {
		event.preventDefault();
		const message = event.message === '' ? '動画の生成に失敗しました' : event.message;
		failAll(new Error(message));
		created.terminate();
		if (videoWorker === created) videoWorker = undefined;
	};
	videoWorker = created;
	return created;
}

function deliver(response: VideoWorkerResponse): void {
	finish(response.id, (job) => {
		if (response.ok) job.resolve({ mimeType: response.mimeType, buffer: response.buffer });
		else job.reject(errorFromWorker(response.name, response.message));
	});
}

function failAll(error: Error): void {
	for (const id of [...pendingJobs.keys()]) finish(id, (job) => job.reject(error));
}

function finish(id: number, action: (job: PendingJob) => void): void {
	const job = pendingJobs.get(id);
	if (!job) return;
	pendingJobs.delete(id);
	job.signal?.removeEventListener('abort', job.onAbort);
	action(job);
}

function toneBuffers(tones: VideoTone[]): ArrayBuffer[] {
	return tones.map((tone) => {
		const buffer = tone.samples.buffer;
		if (!(buffer instanceof ArrayBuffer)) throw new Error('音声の生成に失敗しました');
		return buffer;
	});
}

function errorFromWorker(name: string, message: string): Error {
	if (name === 'AbortError') return new DOMException(message, 'AbortError');
	const error = new Error(message);
	error.name = name;
	return error;
}

function aborted(): DOMException {
	return new DOMException('動画の生成を中断しました', 'AbortError');
}

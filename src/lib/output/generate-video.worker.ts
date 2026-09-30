import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { loadBipBopFont } from '$lib/bip-bop/font';
import { BipBopRenderer, createBipBopDimensions } from '$lib/bip-bop/renderer';
import {
	AudioSample,
	AudioSampleSource,
	BufferTarget,
	CanvasSource,
	getFirstEncodableAudioCodec,
	Output,
	Quality
} from 'mediabunny';
import { videoOutputFormat } from './output';
import type {
	VideoEncodeRequest,
	VideoTone,
	VideoWorkerRequest,
	VideoWorkerResponse
} from './video-job';
import { VIDEO_FPS } from './video-timing';

/**
 * Drawing and encoding run here so the page thread stays responsive.
 * Tones arrive already rendered: this scope has no `OfflineAudioContext`.
 */
const scope = globalThis as unknown as {
	onmessage: ((event: MessageEvent<VideoWorkerRequest>) => void) | null;
	postMessage(message: VideoWorkerResponse, transfer?: Transferable[]): void;
};

const jobs = new Map<number, AbortController>();

scope.onmessage = (event) => {
	const message = event.data;
	if (message.kind === 'abort') {
		jobs.get(message.id)?.abort();
		return;
	}
	const controller = new AbortController();
	jobs.set(message.id, controller);
	void encode(message, controller.signal).finally(() => {
		if (jobs.get(message.id) === controller) jobs.delete(message.id);
	});
};

async function encode(request: VideoEncodeRequest, signal: AbortSignal): Promise<void> {
	try {
		const buffer = await encodeBipBopVideo(request, signal);
		const mimeType = videoOutputFormat(request.outputType).mimeType;
		scope.postMessage({ id: request.id, ok: true, mimeType, buffer }, [buffer]);
	} catch (error) {
		scope.postMessage(failure(request.id, error));
	}
}

async function encodeBipBopVideo(
	request: VideoEncodeRequest,
	signal: AbortSignal
): Promise<ArrayBuffer> {
	if (signal.aborted) throw aborted();
	await loadBipBopFont();
	if (signal.aborted) throw aborted();

	const format = videoOutputFormat(request.outputType);
	const audioCodec = await getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE
	});
	if (!audioCodec) throw new Error('音声コーデックを利用できません');
	if (signal.aborted) throw aborted();

	const canvas = new OffscreenCanvas(request.width, request.height);
	const dimensions = createBipBopDimensions(request.width, request.height);
	const target = new BufferTarget();
	const output = new Output({ format, target });
	const source = new CanvasSource(canvas, {
		codec: request.codec,
		quality: new Quality('high')
	});
	const audioSource = new AudioSampleSource({
		codec: audioCodec,
		quality: new Quality('high')
	});
	output.addVideoTrack(source, { frameRate: VIDEO_FPS });
	output.addAudioTrack(audioSource);

	try {
		await output.start();
		const frameDuration = 1 / VIDEO_FPS;
		for (let frame = 0; frame < request.frameCount; frame += 1) {
			if (signal.aborted) throw aborted();
			BipBopRenderer(canvas, dimensions, frame, {
				mimeType: format.mimeType,
				videoFormat: request.outputType
			});
			if (frame % VIDEO_FPS === 0) await addBipBopTone(audioSource, toneAt(request.tones, frame));
			await source.add(frame * frameDuration, frameDuration);
		}
		if (signal.aborted) throw aborted();
		await output.finalize();
	} catch (error) {
		await cancelOutput(output);
		throw error;
	}

	if (!target.buffer) throw new Error('動画の生成に失敗しました');
	return target.buffer;
}

function toneAt(tones: VideoTone[], frame: number): VideoTone {
	const tone = tones[frame / VIDEO_FPS];
	if (!tone) throw new Error('音声の生成に失敗しました');
	return tone;
}

async function addBipBopTone(source: AudioSampleSource, tone: VideoTone): Promise<void> {
	const sample = new AudioSample({
		data: tone.samples,
		format: 'f32-planar',
		numberOfChannels: 1,
		sampleRate: tone.sampleRate,
		timestamp: tone.second
	});
	try {
		await source.add(sample);
	} finally {
		sample.close();
	}
}

function failure(id: number, error: unknown): VideoWorkerResponse {
	if (error instanceof DOMException || error instanceof Error) {
		return { id, ok: false, name: error.name, message: error.message };
	}
	return { id, ok: false, name: 'Error', message: '動画の生成に失敗しました' };
}

function aborted(): DOMException {
	return new DOMException('動画の生成を中断しました', 'AbortError');
}

async function cancelOutput(output: Output): Promise<void> {
	if (output.state === 'finalized' || output.state === 'canceled') return;
	try {
		await output.cancel();
	} catch {
		// The output can no longer accept samples.
	}
}

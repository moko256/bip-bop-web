import {
	BIP_BOP_AUDIO_SAMPLE_RATE,
	BipBopAudioRenderer,
	bipBopFrequencyHz,
	bipBopToneFrameCount
} from '$lib/bip-bop/audio';
import { loadBipBopFont } from '$lib/bip-bop/font';
import { BipBopRenderer, createBipBopDimensions } from '$lib/bip-bop/renderer';
import {
	AudioSample,
	AudioSampleSource,
	BufferTarget,
	CanvasSource,
	getFirstEncodableAudioCodec,
	Output,
	Quality,
	type VideoCodec
} from 'mediabunny';
import {
	parseResolution,
	videoOutputFormat,
	type Resolution,
	type VideoOutputType
} from './output';

export const VIDEO_FPS = 60;
export const VIDEO_DURATION_SECONDS = 10;

export async function generateBipBopVideo(options: {
	outputType: VideoOutputType;
	codec: VideoCodec;
	width: number;
	height: number;
	frameCount?: number;
	signal?: AbortSignal;
}): Promise<Blob> {
	if (options.signal?.aborted) throw aborted();
	await loadBipBopFont();
	if (options.signal?.aborted) throw aborted();

	const format = videoOutputFormat(options.outputType);
	const audioCodec = await getFirstEncodableAudioCodec(format.getSupportedAudioCodecs(), {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE
	});
	if (!audioCodec) throw new Error('音声コーデックを利用できません');
	if (options.signal?.aborted) throw aborted();

	const canvas = new OffscreenCanvas(options.width, options.height);
	const dimensions = createBipBopDimensions(options.width, options.height);
	const target = new BufferTarget();
	const output = new Output({ format, target });
	const source = new CanvasSource(canvas, {
		codec: options.codec,
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
		const frameCount = options.frameCount ?? VIDEO_FPS * VIDEO_DURATION_SECONDS;
		const frameDuration = 1 / VIDEO_FPS;
		for (let frame = 0; frame < frameCount; frame += 1) {
			if (options.signal?.aborted) throw aborted();
			BipBopRenderer(canvas, dimensions, frame, {
				mimeType: format.mimeType,
				videoFormat: options.outputType
			});
			if (frame % VIDEO_FPS === 0) await addBipBopTone(audioSource, frame / VIDEO_FPS);
			await source.add(frame * frameDuration, frameDuration);
		}
		if (options.signal?.aborted) throw aborted();
		await output.finalize();
	} catch (error) {
		await cancelOutput(output);
		throw error;
	}

	if (!target.buffer) throw new Error('動画の生成に失敗しました');
	return new Blob([target.buffer], { type: format.mimeType });
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
 * Renders one burst at the start of an offline context (0ms from `currentTime`)
 * and places it on `second`.
 */
async function addBipBopTone(source: AudioSampleSource, second: number): Promise<void> {
	const length = bipBopToneFrameCount(BIP_BOP_AUDIO_SAMPLE_RATE);
	const context = new OfflineAudioContext(1, length, BIP_BOP_AUDIO_SAMPLE_RATE);
	BipBopAudioRenderer(context, 0, bipBopFrequencyHz(second));
	const buffer = await context.startRendering();
	const samples = AudioSample.fromAudioBuffer(buffer, second);
	for (const sample of samples) {
		try {
			await source.add(sample);
		} finally {
			sample.close();
		}
	}
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

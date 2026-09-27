import { loadBipBopFont } from '$lib/bip-bop/font';
import { BipBopRenderer, createBipBopDimensions } from '$lib/bip-bop/renderer';
import { BufferTarget, CanvasSource, Output, Quality, type VideoCodec } from 'mediabunny';
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
	const canvas = new OffscreenCanvas(options.width, options.height);
	const dimensions = createBipBopDimensions(options.width, options.height);
	const target = new BufferTarget();
	const output = new Output({ format, target });
	const source = new CanvasSource(canvas, {
		codec: options.codec,
		quality: new Quality('high')
	});
	output.addVideoTrack(source, { frameRate: VIDEO_FPS });

	try {
		await output.start();
		const frameCount = options.frameCount ?? VIDEO_FPS * VIDEO_DURATION_SECONDS;
		const frameDuration = 1 / VIDEO_FPS;
		for (let frame = 0; frame < frameCount; frame += 1) {
			if (options.signal?.aborted) throw aborted();
			BipBopRenderer(canvas, dimensions, frame);
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

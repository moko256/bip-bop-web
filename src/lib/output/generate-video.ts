import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { loadBipBopFont } from '$lib/bip-bop/font';
import { BipBopRenderer, createBipBopDimensions } from '$lib/bip-bop/renderer';
import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from '$lib/bip-bop/timeline';
import { placeBipBopTone } from '$lib/bip-bop/video-tone';
import {
	AudioSampleSource,
	BufferTarget,
	CanvasSource,
	canEncodeAudio,
	getFirstEncodableAudioCodec,
	Output,
	Quality,
	type AudioCodec,
	type VideoCodec
} from 'mediabunny';
import { parseResolution, type Resolution, type VideoOutputType } from './output';
import { supportedAudioCodecs, videoOutputFormat } from './video-container';

export async function generateBipBopVideo(options: {
	outputType: VideoOutputType;
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	width: number;
	height: number;
	frameCount?: number;
	signal?: AbortSignal;
}): Promise<Blob> {
	if (options.signal?.aborted) throw aborted();
	await loadBipBopFont();
	if (options.signal?.aborted) throw aborted();

	const format = videoOutputFormat(options.outputType);
	if (!format.getSupportedAudioCodecs().includes(options.audioCodec)) {
		throw new Error('このオーディオコーデックはコンテナで利用できません');
	}
	const encodable = await canEncodeAudio(options.audioCodec, {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
		quality: new Quality('high')
	});
	if (!encodable) throw new Error('このオーディオコーデックはエンコードできません');
	if (options.signal?.aborted) throw aborted();

	const canvas = new OffscreenCanvas(options.width, options.height);
	const dimensions = createBipBopDimensions(options.width, options.height);
	const target = new BufferTarget();
	const output = new Output({ format, target });
	const source = new CanvasSource(canvas, {
		codec: options.videoCodec,
		quality: new Quality('high')
	});
	const audioSource = new AudioSampleSource({
		codec: options.audioCodec,
		quality: new Quality('high')
	});
	output.addVideoTrack(source, { frameRate: BIP_BOP_FPS });
	output.addAudioTrack(audioSource);

	try {
		await output.start();
		const frameCount = options.frameCount ?? BIP_BOP_MAX_FRAME;
		const frameDuration = 1 / BIP_BOP_FPS;
		for (let frame = 0; frame < frameCount; frame += 1) {
			if (options.signal?.aborted) throw aborted();
			BipBopRenderer(canvas, dimensions, frame, {
				mimeType: format.mimeType,
				videoCodec: options.videoCodec,
				audioCodec: options.audioCodec
			});
			if (frame % BIP_BOP_FPS === 0) await placeBipBopTone(audioSource, frame / BIP_BOP_FPS);
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

/** First audio codec this browser can encode into `type`. */
export async function preferredAudioCodec(type: VideoOutputType): Promise<AudioCodec | null> {
	return getFirstEncodableAudioCodec(supportedAudioCodecs(type), {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
		quality: new Quality('high')
	});
}

export async function generatePlayback(options: {
	outputType: VideoOutputType;
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	resolution: Resolution;
	signal?: AbortSignal;
}): Promise<string> {
	const { width, height } = parseResolution(options.resolution);
	const blob = await generateBipBopVideo({
		outputType: options.outputType,
		videoCodec: options.videoCodec,
		audioCodec: options.audioCodec,
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

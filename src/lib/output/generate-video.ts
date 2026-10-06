import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { loadBipBopFont } from '$lib/bip-bop/font';
import { BipBopRenderer, createBipBopDimensions } from '$lib/bip-bop/renderer';
import { toneSecondAtFrame, videoPictureAtFrame } from '$lib/bip-bop/media-time';
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
	type QualityLevel,
	type VideoCodec
} from 'mediabunny';
import * as m from '$lib/paraglide/messages';
import { parseResolution, type Resolution, type VideoOutputType } from './output';
import type { VideoQualityLevel } from './video-quality';
import { supportedAudioCodecs, videoOutputFormat } from './video-container';

export async function generateBipBopVideo(options: {
	outputType: VideoOutputType;
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	width: number;
	height: number;
	frameCount?: number;
	fps?: number;
	videoQuality?: QualityLevel;
	signal?: AbortSignal;
	onProgress?: (completedFrames: number) => void;
}): Promise<Blob> {
	if (options.signal?.aborted) throw aborted();
	await loadBipBopFont();
	if (options.signal?.aborted) throw aborted();

	const format = videoOutputFormat(options.outputType);
	if (!format.getSupportedAudioCodecs().includes(options.audioCodec)) {
		throw new Error(m.error_audio_codec_unavailable_in_container());
	}
	const encodable = await canEncodeAudio(options.audioCodec, {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
		quality: new Quality('high')
	});
	if (!encodable) throw new Error(m.error_audio_codec_cannot_encode());
	if (options.signal?.aborted) throw aborted();

	const canvas = new OffscreenCanvas(options.width, options.height);
	const dimensions = createBipBopDimensions(options.width, options.height);
	const target = new BufferTarget();
	const output = new Output({ format, target });
	const fps = options.fps ?? BIP_BOP_FPS;
	const videoQuality = options.videoQuality ?? 'high';
	const source = new CanvasSource(canvas, {
		codec: options.videoCodec,
		quality: new Quality(videoQuality)
	});
	const audioSource = new AudioSampleSource({
		codec: options.audioCodec,
		quality: new Quality('high')
	});
	output.addVideoTrack(source, { frameRate: fps });
	output.addAudioTrack(audioSource);

	try {
		await output.start();
		const frameCount = options.frameCount ?? BIP_BOP_MAX_FRAME;
		const frameDuration = 1 / fps;
		for (let frame = 0; frame < frameCount; frame += 1) {
			if (options.signal?.aborted) throw aborted();
			BipBopRenderer(canvas, dimensions, videoPictureAtFrame(frame, fps), {
				mimeType: format.mimeType,
				videoCodec: options.videoCodec,
				audioCodec: options.audioCodec,
				videoQuality,
				fps
			});
			const toneSecond = toneSecondAtFrame(frame, fps);
			if (toneSecond !== null) await placeBipBopTone(audioSource, toneSecond);
			await source.add(frame * frameDuration, frameDuration);
			options.onProgress?.(frame + 1);
		}
		if (options.signal?.aborted) throw aborted();
		await output.finalize();
	} catch (error) {
		await cancelOutput(output);
		throw error;
	}

	if (!target.buffer) throw new Error(m.error_video_generation_failed());
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

/** Blob URL for one generated video. The caller revokes it. */
export async function generatePlayback(options: {
	outputType: VideoOutputType;
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	resolution: Resolution;
	frameCount: number;
	fps: number;
	videoQuality: VideoQualityLevel;
	signal?: AbortSignal;
	onProgress?: (completedFrames: number) => void;
}): Promise<string> {
	const { width, height } = parseResolution(options.resolution);
	const blob = await generateBipBopVideo({
		outputType: options.outputType,
		videoCodec: options.videoCodec,
		audioCodec: options.audioCodec,
		width,
		height,
		frameCount: options.frameCount,
		fps: options.fps,
		videoQuality: options.videoQuality,
		signal: options.signal,
		onProgress: options.onProgress
	});
	if (options.signal?.aborted) throw aborted();
	return URL.createObjectURL(blob);
}

function aborted(): DOMException {
	return new DOMException(m.error_video_generation_aborted(), 'AbortError');
}

async function cancelOutput(output: Output): Promise<void> {
	if (output.state === 'finalized' || output.state === 'canceled') return;
	try {
		await output.cancel();
	} catch {
		// The output can no longer accept samples.
	}
}

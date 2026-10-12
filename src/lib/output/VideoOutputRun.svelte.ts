import type { AudioCodec, VideoCodec } from 'mediabunny';
import { browserScheduler } from '$lib/playback/scheduler';
import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
import { videoPlayback, type PlaybackBounds } from '$lib/playback/video-playback';
import { EncodeCheck } from './EncodeCheck.svelte';
import { canEncodeSelection, type CanEncodeSelection } from './encode-support';
import {
	DEFAULT_FPS,
	DEFAULT_FRAME_COUNT,
	displayedFrameCount,
	initialFrameEntry,
	maxFrameCountForFps,
	withCurrentFps,
	withEnteredFrameCount,
	type FrameEntry
} from './frame-entry';
import { generateVideoUrl, preferredAudioCodec } from './generate-video';
import {
	parseResolution,
	defaultResolution,
	type Resolution,
	type VideoOutputType
} from './output';
import { videoDownloadName } from './video-download-name';
import { defaultVideoQuality, type VideoQualityLevel } from './video-quality';
import { supportedAudioCodecs, supportedVideoCodecs, videoOutputFormat } from './video-container';
import { VideoGeneration, type GenerateVideoUrl } from './VideoGeneration.svelte';

export type VideoOutputRunOptions = {
	outputType: () => VideoOutputType;
	generate?: GenerateVideoUrl;
	canEncode?: CanEncodeSelection;
	audioCodec?: (type: VideoOutputType) => Promise<AudioCodec | null>;
};

/**
 * Settings, encode check, generation, and playback for one video output.
 * `applyPlaybackBounds` writes the length for the transport and the video element together.
 */
export class VideoOutputRun {
	resolution = $state<Resolution>(defaultResolution);
	videoQuality = $state<VideoQualityLevel>(defaultVideoQuality);
	frameEntry = $state<FrameEntry>(initialFrameEntry());
	fpsText = $state(String(DEFAULT_FPS));
	frameCountText = $state(String(DEFAULT_FRAME_COUNT));
	downloadName = $state<string | null>(null);
	readonly generation: VideoGeneration;
	readonly encodeCheck: EncodeCheck;
	readonly session: PlaybackSession;
	readonly attachVideo: (video: HTMLVideoElement) => () => void;

	private readonly readOutputType: () => VideoOutputType;
	private videoCodecChoice = $state<VideoCodec | null>(null);
	private audioCodecChoice = $state<AudioCodec | null>(null);
	private readonly bounds: PlaybackBounds = {
		fps: DEFAULT_FPS,
		maxFrame: DEFAULT_FRAME_COUNT
	};
	private seenOutputType: VideoOutputType | undefined;
	private stopWatch = () => {};

	constructor(options: VideoOutputRunOptions) {
		this.readOutputType = options.outputType;
		this.generation = new VideoGeneration(
			options.generate ?? generateVideoUrl,
			options.audioCodec ?? preferredAudioCodec
		);
		this.encodeCheck = new EncodeCheck(options.canEncode ?? canEncodeSelection);
		const playback = videoPlayback(browserScheduler(), this.bounds);
		this.attachVideo = playback.attach;
		this.session = new PlaybackSession({
			maxFrame: this.bounds.maxFrame,
			fps: this.bounds.fps,
			connect: playback.connect
		});
		this.stopWatch = $effect.root(() => {
			$effect(() => {
				this.noteOutputType();
			});
			$effect(() => {
				void this.noteSelection();
			});
		});
	}

	get outputType(): VideoOutputType {
		return this.readOutputType();
	}

	get bitmap(): { width: number; height: number } {
		return parseResolution(this.resolution);
	}

	get aspectRatio(): string {
		const bitmap = this.bitmap;
		return `${bitmap.width} / ${bitmap.height}`;
	}

	get mimeType(): string {
		return videoOutputFormat(this.outputType).mimeType;
	}

	get videoCodecs(): VideoCodec[] {
		return supportedVideoCodecs(this.outputType);
	}

	get audioCodecs(): AudioCodec[] {
		return supportedAudioCodecs(this.outputType);
	}

	get videoCodec(): VideoCodec {
		const choice = this.videoCodecChoice;
		const codecs = this.videoCodecs;
		if (choice !== null && codecs.includes(choice)) return choice;
		return codecs[0];
	}

	get audioCodec(): AudioCodec {
		const choice = this.audioCodecChoice;
		const codecs = this.audioCodecs;
		if (choice !== null && codecs.includes(choice)) return choice;
		return this.generation.defaultAudioCodec ?? codecs[0];
	}

	get frameCountMax(): number {
		return maxFrameCountForFps(this.frameEntry.currentFps);
	}

	/** Probe the default audio codec, and drop a video when the OutputType changes. */
	noteOutputType(): void {
		const type = this.outputType;
		void this.generation.loadDefaultAudioCodec(type);
		if (this.seenOutputType === undefined) {
			this.seenOutputType = type;
			return;
		}
		if (this.seenOutputType === type) return;
		this.seenOutputType = type;
		this.invalidate();
	}

	/** Ask whether the current codecs and quality can be encoded. */
	noteSelection(): Promise<void> {
		return this.encodeCheck.load({
			videoCodec: this.videoCodec,
			audioCodec: this.audioCodec,
			videoQuality: this.videoQuality
		});
	}

	setFpsText(text: string, fps: number | null): void {
		this.fpsText = text;
		if (fps === null) return;
		const next = withCurrentFps(this.frameEntry, fps);
		if (next === this.frameEntry) return;
		this.frameEntry = next;
		this.frameCountText = String(displayedFrameCount(next));
		this.invalidate();
	}

	setFrameCountText(text: string, frameCount: number | null): void {
		this.frameCountText = text;
		if (frameCount === null) return;
		const next = withEnteredFrameCount(this.frameEntry, frameCount);
		if (next === this.frameEntry) return;
		this.frameEntry = next;
		this.invalidate();
	}

	chooseVideoCodec(value: string): void {
		const match = this.videoCodecs.find((item) => item === value);
		if (match) this.videoCodecChoice = match;
	}

	chooseAudioCodec(value: string): void {
		const match = this.audioCodecs.find((item) => item === value);
		if (match) this.audioCodecChoice = match;
	}

	submit(): void {
		if (!this.encodeCheck.encodable) return;
		const frameCount = Number(this.frameCountText);
		const fps = Number(this.fpsText);
		const bitmap = this.bitmap;
		const videoCodec = this.videoCodec;
		const audioCodec = this.audioCodec;
		const outputType = this.outputType;
		this.downloadName = videoDownloadName({
			width: bitmap.width,
			height: bitmap.height,
			fps,
			frameCount,
			videoCodec,
			audioCodec,
			videoQuality: this.videoQuality,
			extension: outputType
		});
		this.applyPlaybackBounds(frameCount, fps);
		this.session.reset();
		this.generation.start({
			outputType,
			videoCodec,
			audioCodec,
			resolution: this.resolution,
			frameCount,
			fps,
			videoQuality: this.videoQuality
		});
	}

	/** Drop the in-flight video. Playback position stays until the settings change. */
	stop(): void {
		this.generation.cancel();
	}

	invalidate(): void {
		this.downloadName = null;
		this.generation.cancel();
		this.session.reset();
	}

	save(url: string): void {
		if (!this.downloadName) return;
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = this.downloadName;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
	}

	dispose(): void {
		this.stopWatch();
		this.stopWatch = () => {};
		this.session.dispose();
		this.generation.dispose();
		this.encodeCheck.dispose();
	}

	private applyPlaybackBounds(maxFrame: number, fps: number): void {
		this.bounds.fps = fps;
		this.bounds.maxFrame = maxFrame;
		this.session.setBounds(maxFrame, fps);
	}
}

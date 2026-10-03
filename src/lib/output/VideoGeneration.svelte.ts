import type { AudioCodec, VideoCodec } from 'mediabunny';
import { preferredAudioCodec } from './generate-video';
import type { Resolution, VideoOutputType } from './output';
import type { VideoQualityLevel } from './video-quality';

export type VideoGenerationRequest = {
	outputType: VideoOutputType;
	videoCodec: VideoCodec;
	audioCodec: AudioCodec;
	resolution: Resolution;
	frameCount: number;
	fps: number;
	videoQuality: VideoQualityLevel;
};

export type GeneratePlayback = (
	options: VideoGenerationRequest & { signal: AbortSignal }
) => Promise<string>;

/** Start, cancel, and the default audio codec for one video OutputType. */
export class VideoGeneration {
	playback = $state<Promise<string> | null>(null);
	defaultAudioCodec = $state<AudioCodec | null>(null);
	private abort = new AbortController();
	private codecToken = 0;
	private disposed = false;

	constructor(
		private readonly generate: GeneratePlayback,
		private readonly audioCodec: (
			type: VideoOutputType
		) => Promise<AudioCodec | null> = preferredAudioCodec
	) {}

	start(request: VideoGenerationRequest): void {
		if (this.disposed) return;
		this.playback = this.generate({ ...request, signal: this.abort.signal });
	}

	cancel(): void {
		if (this.disposed) return;
		this.abort.abort();
		this.abort = new AbortController();
		this.playback = null;
	}

	async loadDefaultAudioCodec(type: VideoOutputType): Promise<void> {
		const token = ++this.codecToken;
		const match = await this.audioCodec(type);
		if (this.disposed || token !== this.codecToken) return;
		this.defaultAudioCodec = match;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.abort.abort();
	}
}

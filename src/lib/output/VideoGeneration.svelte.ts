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
	options: VideoGenerationRequest & {
		signal: AbortSignal;
		onProgress: (completedFrames: number) => void;
	}
) => Promise<string>;

/** Start, cancel, and the default audio codec for one video OutputType. */
export class VideoGeneration {
	playback = $state<Promise<string> | null>(null);
	/** Frames written for the in-flight video. Zero while idle. */
	completedFrames = $state(0);
	/** Frame count requested for the in-flight video. Zero while idle. */
	totalFrames = $state(0);
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
		this.disconnect();
		const signal = this.abort.signal;
		this.totalFrames = request.frameCount;
		this.completedFrames = 0;
		const playback = Promise.resolve(
			this.generate({
				...request,
				signal,
				onProgress: (completedFrames) => {
					if (signal.aborted) return;
					this.completedFrames = completedFrames;
				}
			})
		).then((url) => this.hold(url, signal));
		void playback.catch(() => undefined);
		this.playback = playback;
	}

	cancel(): void {
		if (this.disposed) return;
		this.disconnect();
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

	/** Drop the current playback. Aborting revokes its blob URL. */
	private disconnect(): void {
		this.abort.abort();
		this.abort = new AbortController();
		this.playback = null;
		this.completedFrames = 0;
		this.totalFrames = 0;
	}

	/** Keep a blob URL until its generation aborts, then revoke it. */
	private hold(url: string, signal: AbortSignal): string {
		const revoke = () => URL.revokeObjectURL(url);
		if (signal.aborted) {
			revoke();
			throw new DOMException('The operation was aborted.', 'AbortError');
		}
		signal.addEventListener('abort', revoke, { once: true });
		return url;
	}
}

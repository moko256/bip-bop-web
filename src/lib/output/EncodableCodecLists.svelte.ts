import type { AudioCodec, VideoCodec } from 'mediabunny';
import { SvelteSet } from 'svelte/reactivity';
import type { VideoOutputType } from './output';
import { encodableAudioCodecs, encodableVideoCodecs } from './video-container';

const noVideoCodecs: VideoCodec[] = [];
const noAudioCodecs: AudioCodec[] = [];

export type LoadEncodableCodecs<T extends string> = (type: VideoOutputType) => Promise<T[]>;

/**
 * Encodable codecs for each video OutputType.
 * The check runs once, the first time that OutputType is shown.
 */
export class EncodableCodecLists {
	private video = $state<Partial<Record<VideoOutputType, VideoCodec[]>>>({});
	private audio = $state<Partial<Record<VideoOutputType, AudioCodec[]>>>({});
	private readonly started = new SvelteSet<VideoOutputType>();

	constructor(
		private readonly loadVideo: LoadEncodableCodecs<VideoCodec> = encodableVideoCodecs,
		private readonly loadAudio: LoadEncodableCodecs<AudioCodec> = encodableAudioCodecs
	) {}

	videoCodecs(type: VideoOutputType): VideoCodec[] {
		return this.video[type] ?? noVideoCodecs;
	}

	audioCodecs(type: VideoOutputType): AudioCodec[] {
		return this.audio[type] ?? noAudioCodecs;
	}

	/** True until this OutputType's encodable video and audio codecs have arrived. */
	loading(type: VideoOutputType): boolean {
		return this.video[type] === undefined || this.audio[type] === undefined;
	}

	/** Start the check the first time `type` is shown. Later calls reuse the list. */
	ensure(type: VideoOutputType): void {
		if (this.started.has(type)) return;
		this.started.add(type);
		void this.load(type);
	}

	private async load(type: VideoOutputType): Promise<void> {
		const [video, audio] = await Promise.allSettled([this.loadVideo(type), this.loadAudio(type)]);
		this.video[type] = video.status === 'fulfilled' ? video.value : [];
		this.audio[type] = audio.status === 'fulfilled' ? audio.value : [];
	}
}

/** Page-lifetime lists. Leaving a tab and coming back does not check again. */
export const encodableCodecLists = new EncodableCodecLists();

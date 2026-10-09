import type { CanPlaySelection, PlaybackSelection } from './playback-support';

/** Async mediabunny playback check for the current codec and quality. */
export class PlaybackCheck {
	/** True while the latest selection is still being checked. */
	checking = $state(true);
	/**
	 * True until a finished check says the selection cannot be played.
	 * Stays true during a check so the generate button stays enabled.
	 */
	playable = $state(true);
	private token = 0;
	private disposed = false;

	constructor(private readonly canPlay: CanPlaySelection) {}

	async load(selection: PlaybackSelection): Promise<void> {
		if (this.disposed) return;
		const token = ++this.token;
		this.checking = true;
		this.playable = true;
		let playable: boolean;
		try {
			playable = await this.canPlay(selection);
		} catch {
			playable = false;
		}
		if (this.disposed || token !== this.token) return;
		this.checking = false;
		this.playable = playable;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.token += 1;
	}
}

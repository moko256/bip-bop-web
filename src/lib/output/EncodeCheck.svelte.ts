import type { CanEncodeSelection, EncodeSelection } from './encode-support';

/** Async mediabunny encode check for the current codecs and video quality. */
export class EncodeCheck {
	/** True while the latest selection is still being checked. */
	checking = $state(true);
	/**
	 * True until a finished check says the selection cannot be encoded.
	 * Stays true during a check so the generate button is not disabled.
	 */
	encodable = $state(true);
	private token = 0;
	private disposed = false;

	constructor(private readonly canEncode: CanEncodeSelection) {}

	async load(selection: EncodeSelection): Promise<void> {
		if (this.disposed) return;
		const token = ++this.token;
		this.checking = true;
		this.encodable = true;
		let encodable: boolean;
		try {
			encodable = await this.canEncode(selection);
		} catch {
			encodable = false;
		}
		if (this.disposed || token !== this.token) return;
		this.checking = false;
		this.encodable = encodable;
	}

	dispose(): void {
		if (this.disposed) return;
		this.disposed = true;
		this.token += 1;
	}
}

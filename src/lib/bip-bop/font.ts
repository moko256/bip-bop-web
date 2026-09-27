import jetbrainsMono from '$lib/fonts/jetbrains-mono-0.woff2?inline';
import { BIP_BOP_FONT_FAMILY, BIP_BOP_RENDERED_TEXTS } from './renderer';

let pending: Promise<void> | undefined;

/**
 * Loads the subset face `scripts/download-jetbrains-mono.mjs` writes next to
 * `jetbrains-mono.css`. Inlined so canvas and video can use it without a
 * separate font request.
 */
export function loadBipBopFont(): Promise<void> {
	if (typeof document === 'undefined' || typeof FontFace === 'undefined') return Promise.resolve();
	pending ??= loadFace();
	return pending;
}

async function loadFace(): Promise<void> {
	try {
		const face = new FontFace(BIP_BOP_FONT_FAMILY, `url("${jetbrainsMono}")`, {
			style: 'normal',
			weight: '400'
		});
		document.fonts.add(await face.load());
		await document.fonts.load(`16px "${BIP_BOP_FONT_FAMILY}"`, BIP_BOP_RENDERED_TEXTS.join(''));
	} catch (error) {
		pending = undefined;
		throw error;
	}
}

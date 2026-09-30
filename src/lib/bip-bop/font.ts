import jetbrainsMono from '$lib/fonts/jetbrains-mono-0.woff2?inline';
import { BIP_BOP_FONT_FAMILY, BIP_BOP_FONT_TEXT } from './renderer';

let pending: Promise<void> | undefined;

/**
 * Loads the subset face `scripts/download-jetbrains-mono.mjs` writes next to
 * `jetbrains-mono.css`. Inlined so the page canvas and the video worker can
 * use it without a separate font request. The page registers it on
 * `document.fonts`. The worker registers it on its own `FontFaceSet`.
 */
export function loadBipBopFont(): Promise<void> {
	const fonts = bipBopFontSet();
	if (!fonts) return Promise.resolve();
	pending ??= loadFace(fonts);
	return pending;
}

/** The document's font set, or the worker's when this module runs off-thread. */
function bipBopFontSet(): FontFaceSet | undefined {
	if (typeof FontFace === 'undefined') return undefined;
	if (typeof document !== 'undefined') return document.fonts;
	if (!('fonts' in globalThis)) return undefined;
	return (globalThis as { fonts?: FontFaceSet }).fonts;
}

async function loadFace(fonts: FontFaceSet): Promise<void> {
	try {
		const face = new FontFace(BIP_BOP_FONT_FAMILY, `url("${jetbrainsMono}")`, {
			style: 'normal',
			weight: '400'
		});
		fonts.add(await face.load());
		await fonts.load(`16px "${BIP_BOP_FONT_FAMILY}"`, BIP_BOP_FONT_TEXT);
	} catch (error) {
		pending = undefined;
		throw error;
	}
}

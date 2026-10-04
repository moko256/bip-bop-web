import { base } from '$app/paths';

/** Both sides of a fullscreen bitmap must be at most this many pixels. */
export const FULLSCREEN_RESOLUTION_LIMIT = 8000;

export type FullscreenBitmap = {
	width: number;
	height: number;
};

/**
 * Read the first `resolution` value as `widthxheight`.
 * Each side is an integer from 1 through {@link FULLSCREEN_RESOLUTION_LIMIT}.
 * Anything else, including a missing value, means the page draws at the DOM size.
 */
export function parseFullscreenResolution(value: string | null): FullscreenBitmap | null {
	if (value === null) return null;
	const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(value);
	if (!match) return null;
	const width = Number(match[1]);
	const height = Number(match[2]);
	if (width > FULLSCREEN_RESOLUTION_LIMIT || height > FULLSCREEN_RESOLUTION_LIMIT) return null;
	return { width, height };
}

/** Absolute fullscreen page URL. A resolution adds `?resolution=`. The current path, query, and hash are dropped. */
export function fullscreenPageUrl(current: URL, resolution: string | null): URL {
	const url = new URL(`${base}/fullscreen`, current);
	url.search = '';
	url.hash = '';
	if (resolution !== null) url.searchParams.set('resolution', resolution);
	return url;
}

export function fullscreenDocumentTitle(
	siteTitle: string,
	bitmap: FullscreenBitmap | null
): string {
	if (!bitmap) return siteTitle;
	return `${siteTitle} (${bitmap.width}x${bitmap.height})`;
}

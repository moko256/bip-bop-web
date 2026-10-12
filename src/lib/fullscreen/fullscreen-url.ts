import type { ResolutionBitmap } from '#lib/output/output';
import { siteBase } from '../../../site-url';

/** Absolute fullscreen page URL. A resolution adds `?resolution=`. The current path, query, and hash are dropped. */
export function fullscreenPageUrl(current: URL, resolution: string | null): URL {
	const url = new URL(`${siteBase}/fullscreen`, current);
	url.search = '';
	url.hash = '';
	if (resolution !== null) url.searchParams.set('resolution', resolution);
	return url;
}

export function fullscreenDocumentTitle(
	siteTitle: string,
	bitmap: ResolutionBitmap | null
): string {
	if (!bitmap) return siteTitle;
	return `${siteTitle} (${bitmap.width}x${bitmap.height})`;
}

import { deLocalizeUrl } from '#lib/paraglide/runtime.js';
import { siteBase } from '../../../site-url';

const localizedFullscreen = new RegExp(`^${siteBase}/(?:en|ja)/fullscreen/?$`);

/** Localized fullscreen paths stay unmatched so the router shows the error page. */
export function reroutePathname(url: URL): string {
	if (localizedFullscreen.test(url.pathname)) return url.pathname;
	return deLocalizeUrl(url).pathname;
}

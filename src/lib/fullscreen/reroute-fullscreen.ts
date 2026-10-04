import { base } from '$app/paths';
import { deLocalizeUrl } from '$lib/paraglide/runtime';

const localizedFullscreen = new RegExp(`^${base}/(?:en|ja)/fullscreen/?$`);

/** Localized fullscreen paths stay unmatched so the router shows the error page. */
export function reroutePathname(url: URL): string {
	if (localizedFullscreen.test(url.pathname)) return url.pathname;
	return deLocalizeUrl(url).pathname;
}

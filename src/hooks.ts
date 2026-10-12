import type { Reroute } from '@sveltejs/kit/hooks';
import { reroutePathname } from '#lib/fullscreen/reroute-fullscreen';

export const reroute: Reroute = (request) => reroutePathname(request.url);

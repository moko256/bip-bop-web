import { formatFpsFilenameToken } from '$lib/bip-bop/fps-text';

export function videoDownloadName(options: {
	width: number;
	height: number;
	fps: number;
	frameCount: number;
	videoCodec: string;
	audioCodec: string;
	videoQuality: string;
	extension: string;
}): string {
	const fpsToken = formatFpsFilenameToken(options.fps);
	return `bip-bop_${options.width}x${options.height}_${fpsToken}fps_${options.frameCount}_${options.videoCodec}_${options.audioCodec}_${options.videoQuality}.${options.extension}`;
}

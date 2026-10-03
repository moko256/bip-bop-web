<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBipBopFont } from './font';
	import { videoPictureAtFrame } from './media-time';
	import { BipBopRenderer, createBipBopDimensions, type BipBopVideoCorner } from './renderer';
	import { BIP_BOP_FPS } from './timeline';

	let {
		width,
		height,
		video
	}: {
		width: number;
		height: number;
		video?: BipBopVideoCorner;
	} = $props();

	/**
	 * Draws frame 0 at the bitmap size. CSS scales the canvas; the bitmap stays
	 * at `width` × `height` and is not matched to the DOM.
	 */
	const paint: Attachment<HTMLCanvasElement> = (canvas) => {
		let canceled = false;
		const bitmapWidth = width;
		const bitmapHeight = height;
		const corner = video
			? {
					mimeType: video.mimeType,
					videoCodec: video.videoCodec,
					audioCodec: video.audioCodec,
					videoQuality: video.videoQuality,
					fps: video.fps
				}
			: undefined;

		void loadBipBopFont().finally(() => {
			if (canceled) return;
			canvas.width = bitmapWidth;
			canvas.height = bitmapHeight;
			BipBopRenderer(
				canvas,
				createBipBopDimensions(bitmapWidth, bitmapHeight),
				videoPictureAtFrame(0, corner?.fps ?? BIP_BOP_FPS),
				corner
			);
		});

		return () => {
			canceled = true;
		};
	};
</script>

<canvas {width} {height} aria-hidden="true" {@attach paint}></canvas>

<style>
	canvas {
		display: block;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		object-fit: contain;
		image-rendering: pixelated;
	}
</style>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions, type BipBopVideoCorner } from './renderer';

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
			BipBopRenderer(canvas, createBipBopDimensions(bitmapWidth, bitmapHeight), 0, corner);
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
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}
</style>

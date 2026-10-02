<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';

	let { width, height }: { width: number; height: number } = $props();

	/**
	 * Draws frame 0 at the bitmap size. CSS scales the canvas; the bitmap stays
	 * at `width` × `height` and is not matched to the DOM.
	 */
	const paint: Attachment<HTMLCanvasElement> = (canvas) => {
		let canceled = false;
		const bitmapWidth = width;
		const bitmapHeight = height;

		void loadBipBopFont().finally(() => {
			if (canceled) return;
			canvas.width = bitmapWidth;
			canvas.height = bitmapHeight;
			BipBopRenderer(canvas, createBipBopDimensions(bitmapWidth, bitmapHeight), 0);
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
	}
</style>

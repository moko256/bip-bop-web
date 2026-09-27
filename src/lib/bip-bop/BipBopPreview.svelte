<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';

	const PREVIEW_LABEL = 'Bip-Bop preview';

	// The template never reads these, so they stay plain values.
	// `devicePixels` is the host's width and height in device pixels (high DPI included).
	let frame = 0;
	let devicePixels: ResizeObserverSize[] | undefined;

	function bitmapSize(
		size: ResizeObserverSize[] | undefined
	): { width: number; height: number } | null {
		const box = size?.[0];
		if (!box) return null;
		const width = Math.round(box.inlineSize);
		const height = Math.round(box.blockSize);
		if (width <= 0 || height <= 0) return null;
		return { width, height };
	}

	function createPreviewCanvas(width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.setAttribute('aria-label', PREVIEW_LABEL);
		return canvas;
	}

	const play: Attachment<HTMLDivElement> = (host) => {
		let rafId = 0;
		let stopped = false;
		let canvas: HTMLCanvasElement | null = null;

		const tick = () => {
			if (stopped) return;
			const size = bitmapSize(devicePixels);

			if (size) {
				const dimensions = createBipBopDimensions(size.width, size.height);
				if (!canvas || canvas.width !== size.width || canvas.height !== size.height) {
					canvas = createPreviewCanvas(size.width, size.height);
					BipBopRenderer(canvas, dimensions, frame);
					host.replaceChildren(canvas);
				} else {
					BipBopRenderer(canvas, dimensions, frame);
				}
				frame += 1;
			}

			rafId = requestAnimationFrame(tick);
		};

		void loadBipBopFont().finally(() => {
			if (!stopped) rafId = requestAnimationFrame(tick);
		});

		return () => {
			stopped = true;
			cancelAnimationFrame(rafId);
		};
	};
</script>

<div
	class="preview"
	bind:devicePixelContentBoxSize={
		null,
		(size) => {
			devicePixels = size ?? undefined;
		}
	}
	{@attach play}
></div>

<style>
	.preview {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
	}

	.preview :global(canvas) {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		image-rendering: pixelated;
	}
</style>

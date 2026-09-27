<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';

	const play: Attachment<HTMLCanvasElement> = (canvas) => {
		// The template never reads the counter, so it stays a plain number.
		let frame = 0;
		let rafId = 0;
		let stopped = false;

		const tick = () => {
			if (stopped) return;
			const width = Math.round(canvas.clientWidth * window.devicePixelRatio);
			const height = Math.round(canvas.clientHeight * window.devicePixelRatio);

			if (width > 0 && height > 0) {
				if (canvas.width !== width || canvas.height !== height) {
					canvas.width = width;
					canvas.height = height;
				}

				BipBopRenderer(canvas, createBipBopDimensions(width, height), frame);
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

<canvas {@attach play} width="1920" height="1080" aria-label="Bip-Bop preview"></canvas>

<style>
	canvas {
		width: 100%;
	}
</style>

<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';

	const play: Attachment<HTMLCanvasElement> = (canvas) => {
		// The template never reads the counter, so it stays a plain number.
		let frame = 0;
		let rafId = 0;

		const tick = () => {
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

		rafId = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(rafId);
		};
	};
</script>

<div class="stage">
	<canvas {@attach play} aria-label="Bip-Bop preview"></canvas>
</div>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		background: #000;
		overflow: hidden;
	}

	.stage {
		display: grid;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		place-items: center;
		background: #000;
	}

	canvas {
		display: block;
		width: min(100vw, calc(100vh * 16 / 9));
		width: min(100vw, calc(100dvh * 16 / 9));
		height: min(100vh, calc(100vw * 9 / 16));
		height: min(100dvh, calc(100vw * 9 / 16));
		background: #000;
	}
</style>

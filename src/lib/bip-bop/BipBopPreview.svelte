<script lang="ts">
	import { browserPlaybackClock } from '$lib/playback/clock';
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import type { Attachment } from 'svelte/attachments';
	import { canvasPlayback } from './canvas-playback';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';
	import * as m from '$lib/paraglide/messages';
	import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from './timeline';
	const session = new PlaybackSession({
		maxFrame: BIP_BOP_MAX_FRAME,
		fps: BIP_BOP_FPS,
		connect: canvasPlayback(browserPlaybackClock())
	});

	function bitmapSize(host: HTMLElement): { width: number; height: number } | null {
		const dpr = window.devicePixelRatio || 1;
		const width = Math.round(host.clientWidth * dpr);
		const height = Math.round(host.clientHeight * dpr);
		if (width <= 0 || height <= 0) return null;
		return { width, height };
	}

	function createPreviewCanvas(width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.setAttribute('aria-label', m.bip_bop_preview_aria());
		return canvas;
	}

	const paint: Attachment<HTMLDivElement> = (host) => {
		let canvas: HTMLCanvasElement | null = null;
		let ready = false;
		let canceled = false;

		const draw = (current: number) => {
			const size = bitmapSize(host);
			if (!size) return;
			const dimensions = createBipBopDimensions(size.width, size.height);
			if (!canvas || canvas.width !== size.width || canvas.height !== size.height) {
				canvas = createPreviewCanvas(size.width, size.height);
				host.replaceChildren(canvas);
			}
			BipBopRenderer(canvas, dimensions, current);
		};

		void loadBipBopFont().finally(() => {
			if (canceled) return;
			ready = true;
			draw(session.frame);
		});

		$effect(() => {
			const current = session.frame;
			if (!ready) return;
			draw(current);
		});

		const observer = new ResizeObserver(() => {
			if (!ready) return;
			draw(session.frame);
		});
		observer.observe(host);

		return () => {
			canceled = true;
			observer.disconnect();
		};
	};

	const release: Attachment<HTMLDivElement> = () => {
		return () => session.dispose();
	};
</script>

<PlaybackControls
	playing={session.playing}
	frame={session.frame}
	maxFrame={session.maxFrame}
	fps={session.fps}
	onplaybackchange={(next) => session.setPlaying(next)}
	onframechange={(next) => session.seek(next)}
>
	<div class="preview" {@attach paint} {@attach release}></div>
</PlaybackControls>

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

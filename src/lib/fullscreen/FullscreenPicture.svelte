<script lang="ts">
	import { browserPlaybackClock } from '$lib/playback/clock';
	import OverlayPlayback from '$lib/playback/OverlayPlayback.svelte';
	import type { PlaybackContentProps } from '$lib/playback/playback-content';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import type { Attachment } from 'svelte/attachments';
	import {
		canvasPlayback,
		createCanvasPicture,
		liveCanvasAudio
	} from '$lib/bip-bop/canvas-playback';
	import { loadBipBopFont } from '$lib/bip-bop/font';
	import { BipBopRenderer, createBipBopDimensions, type BipBopSample } from '$lib/bip-bop/renderer';
	import * as m from '$lib/paraglide/messages';
	import { BIP_BOP_FPS } from '$lib/bip-bop/timeline';
	import type { FullscreenBitmap } from './fullscreen-url';

	let { bitmap }: { bitmap: FullscreenBitmap | null } = $props();

	const playbackClock = browserPlaybackClock();
	const picture = createCanvasPicture();
	const session = new PlaybackSession({
		fps: BIP_BOP_FPS,
		connect: canvasPlayback(playbackClock, liveCanvasAudio(playbackClock), picture)
	});

	function domBitmap(host: HTMLElement): FullscreenBitmap | null {
		const dpr = window.devicePixelRatio || 1;
		const width = Math.round(host.clientWidth * dpr);
		const height = Math.round(host.clientHeight * dpr);
		if (width <= 0 || height <= 0) return null;
		return { width, height };
	}

	function createPictureCanvas(width: number, height: number): HTMLCanvasElement {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.setAttribute('aria-label', m.bip_bop_preview_aria());
		return canvas;
	}

	const paint: Attachment<HTMLDivElement> = (host) => {
		let canvas: HTMLCanvasElement | null = null;
		let bitmapWidth = 0;
		let bitmapHeight = 0;
		let dimensions: ReturnType<typeof createBipBopDimensions> | null = null;
		let ready = false;
		let canceled = false;

		const draw = (current: number, size: FullscreenBitmap | null) => {
			const next = size ?? domBitmap(host);
			if (!next) return;
			if (!canvas || !dimensions || bitmapWidth !== next.width || bitmapHeight !== next.height) {
				canvas = createPictureCanvas(next.width, next.height);
				bitmapWidth = next.width;
				bitmapHeight = next.height;
				dimensions = createBipBopDimensions(next.width, next.height);
				host.replaceChildren(canvas);
			}
			BipBopRenderer(canvas, dimensions, previewSample(current));
		};

		void loadBipBopFont().finally(() => {
			if (canceled) return;
			ready = true;
			draw(session.frame, bitmap);
		});

		$effect(() => {
			const current = session.frame;
			const size = bitmap;
			if (!ready) return;
			draw(current, size);
		});

		const observer = new ResizeObserver(() => {
			if (!ready) return;
			draw(session.frame, bitmap);
		});
		observer.observe(host);

		return () => {
			canceled = true;
			observer.disconnect();
		};
	};

	function previewSample(frame: number): BipBopSample {
		return {
			frame,
			clockCentiseconds: picture.clockCentiseconds,
			cycleFraction: picture.cycleFraction,
			cycleLength: 1,
			beat: picture.beat,
			showBeat: picture.showBeat,
			...(picture.previewFps === null ? {} : { previewFps: picture.previewFps })
		};
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => session.dispose();
	};

	function onplaybackchange(next: boolean) {
		if (next) requestPageFullscreen();
		session.setPlaying(next);
	}

	function requestPageFullscreen() {
		const request = document.documentElement.requestFullscreen;
		if (typeof request !== 'function') return;
		void request.call(document.documentElement).catch(() => {});
	}
</script>

<div class="fullscreen-stage">
	<div
		class="frame"
		class:fixed={bitmap !== null}
		style:--bitmap-width={bitmap?.width}
		style:--bitmap-height={bitmap?.height}
	>
		<OverlayPlayback playing={session.playing} {onplaybackchange} content={pictureContent} />
	</div>
</div>

{#snippet pictureContent({ onclick }: PlaybackContentProps)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="picture" {onclick} {@attach paint} {@attach release}></div>
{/snippet}

<style>
	:global(html:has(.fullscreen-stage)),
	:global(html:has(.fullscreen-stage) body) {
		margin: 0;
		height: 100%;
		background: #000;
		overflow: hidden;
	}

	.fullscreen-stage {
		container-type: size;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 100%;
		height: 100dvh;
		margin: 0;
		border: 0;
		background: #000;
	}

	.frame {
		position: relative;
		box-sizing: border-box;
		min-width: 0;
		min-height: 0;
		margin: 0;
		border: 0;
	}

	.frame.fixed {
		width: min(100cqw, calc(100cqh * var(--bitmap-width) / var(--bitmap-height)));
		aspect-ratio: var(--bitmap-width) / var(--bitmap-height);
	}

	.frame:not(.fixed) {
		width: 100%;
		height: 100%;
	}

	.frame :global(.surface) {
		position: absolute;
		inset: 0;
	}

	.frame :global(.content),
	.picture {
		width: 100%;
		height: 100%;
	}

	.picture {
		position: relative;
	}

	.picture :global(canvas) {
		position: absolute;
		inset: 0;
		display: block;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		border: 0;
		image-rendering: pixelated;
	}
</style>

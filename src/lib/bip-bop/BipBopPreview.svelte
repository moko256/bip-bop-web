<script lang="ts">
	import { browserPlaybackClock } from '$lib/playback/clock';
	import type { PlaybackContentProps } from '$lib/playback/playback-content';
	import UnlimitedPlaybackControls from '$lib/playback/UnlimitedPlaybackControls.svelte';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import type { Attachment } from 'svelte/attachments';
	import { canvasPlayback, createCanvasPicture, liveCanvasAudio } from './canvas-playback';
	import { loadBipBopFont } from './font';
	import type { PlaybackContentProps } from '$lib/playback/playback-content';
	import { BipBopRenderer, createBipBopDimensions, type BipBopSample } from './renderer';
	import * as m from '$lib/paraglide/messages';
	import { BIP_BOP_FPS } from './timeline';
	const playbackClock = browserPlaybackClock();
	const picture = createCanvasPicture();
	const session = new PlaybackSession({
		fps: BIP_BOP_FPS,
		connect: canvasPlayback(playbackClock, liveCanvasAudio(playbackClock), picture)
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
		let bitmapWidth = 0;
		let bitmapHeight = 0;
		let dimensions: ReturnType<typeof createBipBopDimensions> | null = null;
		let ready = false;
		let canceled = false;

		const draw = (current: number) => {
			const size = bitmapSize(host);
			if (!size) return;
			if (!canvas || !dimensions || bitmapWidth !== size.width || bitmapHeight !== size.height) {
				canvas = createPreviewCanvas(size.width, size.height);
				bitmapWidth = size.width;
				bitmapHeight = size.height;
				dimensions = createBipBopDimensions(size.width, size.height);
				host.replaceChildren(canvas);
			}
			BipBopRenderer(canvas, dimensions, previewSample(current));
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
</script>

{#snippet content({ onclick }: PlaybackContentProps)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="preview" {onclick} {@attach paint} {@attach release}></div>
{/snippet}

<UnlimitedPlaybackControls
	playing={session.playing}
	frame={session.frame}
	onplaybackchange={(next) => session.setPlaying(next)}
	onframechange={(next) => session.seek(next)}
	{content}
/>

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

<script lang="ts">
	import { browserScheduler } from '$lib/playback/scheduler';
	import type { PlaybackContent, PlaybackContentProps } from '$lib/playback/playback-content';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import type { Attachment } from 'svelte/attachments';
	import type { Snippet } from 'svelte';
	import { canvasPlayback, createCanvasPicture, liveCanvasAudio } from './canvas-playback';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions, type BipBopSample } from './renderer';
	import * as m from '$lib/paraglide/messages';
	import { BIP_BOP_FPS } from './frames';

	/**
	 * The one live picture. The page preview and the fullscreen page both draw here.
	 * `view` places the canvas in the Playback chrome for that page.
	 */
	let {
		bitmap = null,
		aspectRatio,
		fill = false,
		view
	}: {
		/**
		 * Canvas backing store. CSS still sizes the element to the host.
		 * Absent means the host size times devicePixelRatio.
		 */
		bitmap?: { width: number; height: number } | null;
		/** Host aspect ratio. The fullscreen frame sizes itself and leaves this unset. */
		aspectRatio?: string;
		/** Stretch the host to the frame. The fullscreen page sets this. */
		fill?: boolean;
		view: Snippet<
			[
				{
					playing: boolean;
					frame: number;
					setPlaying: (playing: boolean) => void;
					seek: (frame: number) => void;
					canvas: PlaybackContent;
				}
			]
		>;
	} = $props();

	const scheduler = browserScheduler();
	const picture = createCanvasPicture();
	const session = new PlaybackSession({
		fps: BIP_BOP_FPS,
		connect: canvasPlayback(scheduler, liveCanvasAudio(scheduler), picture)
	});

	function setPlaying(next: boolean) {
		session.setPlaying(next);
	}

	function seek(next: number) {
		session.seek(next);
	}

	function bitmapSize(host: HTMLElement): { width: number; height: number } | null {
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

		const draw = (current: number, size: { width: number; height: number } | null) => {
			const next = size ?? bitmapSize(host);
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
			elapsedCentiseconds: picture.elapsedCentiseconds,
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

{#snippet canvas({ onclick }: PlaybackContentProps)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="host"
		class:fill
		style:aspect-ratio={aspectRatio}
		{onclick}
		{@attach paint}
		{@attach release}
	></div>
{/snippet}

{@render view({ playing: session.playing, frame: session.frame, setPlaying, seek, canvas })}

<style>
	.host {
		position: relative;
		width: 100%;
	}

	.host.fill {
		height: 100%;
	}

	.host :global(canvas) {
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

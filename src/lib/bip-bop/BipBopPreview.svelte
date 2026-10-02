<script lang="ts">
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { clampFrame } from '$lib/playback/time';
	import type { Attachment } from 'svelte/attachments';
	import { BipBopAudioRenderer, bipBopPreviewPictureMs, planBipBopPreviewCue } from './audio';
	import { loadBipBopFont } from './font';
	import {
		BIP_BOP_CYCLE_FRAMES,
		BipBopRenderer,
		bipBopFrameIndex,
		createBipBopDimensions
	} from './renderer';

	const PREVIEW_LABEL = 'Bip-Bop preview';
	const FPS = BIP_BOP_CYCLE_FRAMES;
	/** Ten seconds, the same length as an exported video. */
	const MAX_FRAME = FPS * 10;

	let playing = $state(false);
	let frame = $state(0);

	let rafId = 0;
	let toneTimer = 0;
	let startedAt = 0;
	let pictureShiftMs = 0;
	let renderedMs = 0;
	let audio: AudioContext | null = null;
	let disposed = false;

	/** `AudioContext.outputLatency` in milliseconds. Missing or negative reads as 0. */
	function outputLeadMs(context: AudioContext): number {
		const latency = context.outputLatency;
		if (!Number.isFinite(latency) || latency <= 0) return 0;
		return latency * 1000;
	}

	function audioElapsedMs(now = Date.now()): number {
		return now - startedAt;
	}

	function pictureElapsedMs(now = Date.now()): number {
		const next = bipBopPreviewPictureMs(audioElapsedMs(now), pictureShiftMs, renderedMs);
		renderedMs = next;
		return next;
	}

	function silence() {
		window.clearTimeout(toneTimer);
		toneTimer = 0;
		const previous = audio;
		audio = null;
		if (previous) void previous.close();
	}

	function stopClock() {
		cancelAnimationFrame(rafId);
		rafId = 0;
		silence();
	}

	function scheduleTone(elapsedMs: number) {
		if (disposed || !playing) return;
		const context = audio;
		if (!context || context.state !== 'running') return;
		const cue = planBipBopPreviewCue(elapsedMs, outputLeadMs(context), pictureShiftMs);
		pictureShiftMs = cue.pictureShiftMs;
		BipBopAudioRenderer(context, cue.delayMs, cue.frequencyHz);
		toneTimer = window.setTimeout(() => scheduleTone(audioElapsedMs()), cue.waitMs);
	}

	function beginPlayback(elapsedMs: number) {
		pictureShiftMs = 0;
		renderedMs = elapsedMs;
		startedAt = Date.now() - elapsedMs;
		// Queue the burst before drawing. outputLatency is how long the device
		// holds it, so the picture meets the sound when the burst comes out.
		scheduleTone(elapsedMs);
		rafId = requestAnimationFrame(tick);
	}

	function tick() {
		if (disposed || !playing) return;
		const next = Math.min(MAX_FRAME, bipBopFrameIndex(pictureElapsedMs()));
		if (next !== frame) frame = next;
		if (next >= MAX_FRAME) {
			playing = false;
			stopClock();
			return;
		}
		rafId = requestAnimationFrame(tick);
	}

	function startFromCurrentFrame() {
		stopClock();
		const elapsedMs = (frame * 1000) / FPS;
		playing = true;
		// Playback favors a steady buffer over the lowest delay. The cue uses
		// outputLatency so that buffer does not put the sound behind the picture.
		const context = new AudioContext({ latencyHint: 'playback' });
		audio = context;
		const run = () => {
			if (disposed || !playing || audio !== context) return;
			beginPlayback(elapsedMs);
		};
		if (context.state === 'running') {
			run();
			return;
		}
		void context
			.resume()
			.then(run)
			.catch(() => {
				// Unmount closes the context while this promise can still be pending.
			});
	}

	function onplaybackchange(next: boolean) {
		if (!next) {
			playing = false;
			stopClock();
			return;
		}
		if (frame >= MAX_FRAME) frame = 0;
		startFromCurrentFrame();
	}

	function onframechange(next: number) {
		frame = clampFrame(next, MAX_FRAME);
		if (!playing) return;
		if (frame >= MAX_FRAME) {
			playing = false;
			stopClock();
			return;
		}
		startFromCurrentFrame();
	}

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
		canvas.setAttribute('aria-label', PREVIEW_LABEL);
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
			draw(frame);
		});

		$effect(() => {
			const current = frame;
			if (!ready) return;
			draw(current);
		});

		const observer = new ResizeObserver(() => {
			if (!ready) return;
			draw(frame);
		});
		observer.observe(host);

		return () => {
			canceled = true;
			observer.disconnect();
		};
	};

	const release: Attachment<HTMLDivElement> = () => {
		return () => {
			disposed = true;
			stopClock();
		};
	};
</script>

<PlaybackControls
	{playing}
	{frame}
	maxFrame={MAX_FRAME}
	fps={FPS}
	{onplaybackchange}
	{onframechange}
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

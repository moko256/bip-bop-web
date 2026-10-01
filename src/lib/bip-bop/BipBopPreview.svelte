<script lang="ts">
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { clampFrame } from '$lib/playback/time';
	import type { Attachment } from 'svelte/attachments';
	import { BipBopAudioRenderer, planBipBopTone } from './audio';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, createBipBopDimensions } from './renderer';
	import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME, frameAtElapsedMs, secondsAtFrame } from './timeline';

	const PREVIEW_LABEL = 'Bip-Bop preview';

	let playing = $state(false);
	let frame = $state(0);

	let rafId = 0;
	let toneTimer = 0;
	let startedAt = 0;
	let audio: AudioContext | null = null;
	let disposed = false;

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
		const plan = planBipBopTone(elapsedMs);
		BipBopAudioRenderer(context, plan.delayMs, plan.frequencyHz);
		toneTimer = window.setTimeout(() => scheduleTone(Date.now() - startedAt), plan.waitMs);
	}

	function startAudio(elapsedMs: number) {
		const context = audio;
		if (!context) return;
		const run = (elapsed: number) => {
			if (disposed || !playing || audio !== context) return;
			scheduleTone(elapsed);
		};
		if (context.state === 'running') {
			run(elapsedMs);
			return;
		}
		void context
			.resume()
			.then(() => run(Math.max(elapsedMs, Date.now() - startedAt)))
			.catch(() => {
				// Unmount closes the context while this promise can still be pending.
			});
	}

	function tick() {
		if (disposed || !playing) return;
		const next = Math.min(BIP_BOP_MAX_FRAME, frameAtElapsedMs(Date.now() - startedAt));
		if (next !== frame) frame = next;
		if (next >= BIP_BOP_MAX_FRAME) {
			playing = false;
			stopClock();
			return;
		}
		rafId = requestAnimationFrame(tick);
	}

	function startFromCurrentFrame() {
		stopClock();
		const elapsedMs = secondsAtFrame(frame) * 1000;
		startedAt = Date.now() - elapsedMs;
		playing = true;
		audio = new AudioContext();
		rafId = requestAnimationFrame(tick);
		startAudio(elapsedMs);
	}

	function onplaybackchange(next: boolean) {
		if (!next) {
			playing = false;
			stopClock();
			return;
		}
		if (frame >= BIP_BOP_MAX_FRAME) frame = 0;
		startFromCurrentFrame();
	}

	function onframechange(next: number) {
		frame = clampFrame(next, BIP_BOP_MAX_FRAME);
		if (!playing) return;
		if (frame >= BIP_BOP_MAX_FRAME) {
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
	maxFrame={BIP_BOP_MAX_FRAME}
	fps={BIP_BOP_FPS}
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

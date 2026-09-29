<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import { BipBopAudioRenderer, planBipBopTone } from './audio';
	import { loadBipBopFont } from './font';
	import { BipBopRenderer, bipBopFrameIndex, createBipBopDimensions } from './renderer';

	const PREVIEW_LABEL = 'Bip-Bop preview';

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

	const play: Attachment<HTMLDivElement> = (host) => {
		let rafId = 0;
		let toneTimer = 0;
		let stopped = false;
		let clockStarted = false;
		let playedWhileRunning = false;
		let canvas: HTMLCanvasElement | null = null;
		let startedAt = 0;
		const audio = new AudioContext();

		const draw = () => {
			if (stopped) return;
			const size = bitmapSize(host);

			if (size) {
				const frame = bipBopFrameIndex(Date.now() - startedAt);
				const dimensions = createBipBopDimensions(size.width, size.height);
				if (!canvas || canvas.width !== size.width || canvas.height !== size.height) {
					canvas = createPreviewCanvas(size.width, size.height);
					BipBopRenderer(canvas, dimensions, frame);
					host.replaceChildren(canvas);
				} else {
					BipBopRenderer(canvas, dimensions, frame);
				}
			}

			rafId = requestAnimationFrame(draw);
		};

		// Wake after each burst, then schedule the next whole second from the preview clock.
		const scheduleTone = () => {
			if (stopped || !clockStarted) return;
			const plan = planBipBopTone(Date.now() - startedAt);
			playedWhileRunning = audio.state === 'running';
			if (playedWhileRunning) {
				BipBopAudioRenderer(audio, plan.delayMs, plan.frequencyHz);
			}
			toneTimer = window.setTimeout(scheduleTone, plan.waitMs);
		};

		const onAudioState = () => {
			if (stopped || !clockStarted || audio.state !== 'running' || playedWhileRunning) return;
			window.clearTimeout(toneTimer);
			scheduleTone();
		};

		const resumeAudio = () => {
			if (audio.state !== 'running') void audio.resume();
		};

		audio.addEventListener('statechange', onAudioState);
		window.addEventListener('pointerdown', resumeAudio);
		window.addEventListener('keydown', resumeAudio);
		resumeAudio();

		void loadBipBopFont().finally(() => {
			if (stopped) return;
			clockStarted = true;
			startedAt = Date.now();
			scheduleTone();
			draw();
		});

		return () => {
			stopped = true;
			cancelAnimationFrame(rafId);
			window.clearTimeout(toneTimer);
			audio.removeEventListener('statechange', onAudioState);
			window.removeEventListener('pointerdown', resumeAudio);
			window.removeEventListener('keydown', resumeAudio);
			void audio.close();
		};
	};
</script>

<div class="preview" {@attach play}></div>

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

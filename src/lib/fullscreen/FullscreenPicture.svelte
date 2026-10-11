<script lang="ts">
	import BipBopLivePicture from '$lib/bip-bop/BipBopLivePicture.svelte';
	import OverlayPlayback from '$lib/playback/OverlayPlayback.svelte';
	import type { FullscreenBitmap } from './fullscreen-url';

	let { bitmap }: { bitmap: FullscreenBitmap | null } = $props();

	function onplaybackchange(next: boolean, setPlaying: (playing: boolean) => void) {
		if (next) requestPageFullscreen();
		setPlaying(next);
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
		<BipBopLivePicture {bitmap} fill>
			{#snippet view({ playing, setPlaying, canvas })}
				<OverlayPlayback
					{playing}
					onplaybackchange={(next) => onplaybackchange(next, setPlaying)}
					content={canvas}
				/>
			{/snippet}
		</BipBopLivePicture>
	</div>
</div>

<style>
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

	.frame :global(.content) {
		width: 100%;
		height: 100%;
	}
</style>

<script lang="ts">
	import type { PlaybackContent } from './playback-content';
	import PlaybackIcon from './PlaybackIcon.svelte';
	import { stoppedVeilColor } from './veil';

	let {
		playing,
		onplaybackchange,
		content
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
		content: PlaybackContent;
	} = $props();

	function togglePlayback() {
		onplaybackchange(!playing);
	}
</script>

<div class="surface">
	<div class="content">
		{@render content({ onclick: togglePlayback })}
	</div>
	<div class={['veil', { playing }]} style:--stopped-veil={stoppedVeilColor} aria-hidden="true">
		{#if !playing}
			<PlaybackIcon name="play-circle" size="4rem" />
		{/if}
	</div>
</div>

<style>
	.surface {
		position: relative;
	}

	.content {
		position: relative;
		z-index: 0;
	}

	div.veil {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: grid;
		place-items: center;
		box-sizing: border-box;
		width: 100%;
		height: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: var(--stopped-veil);
		color: #fff;
		pointer-events: none;
	}

	div.veil.playing {
		background: transparent;
	}
</style>

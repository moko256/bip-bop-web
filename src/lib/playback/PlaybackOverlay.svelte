<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlaybackIcon from './PlaybackIcon.svelte';
	import { stoppedVeilColor } from './veil';

	let {
		playing,
		onplaybackchange,
		children
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
		children: Snippet;
	} = $props();
</script>

<div class="surface">
	<div class="content">
		{@render children()}
	</div>
	<button
		type="button"
		class={['veil', { playing }]}
		style:--stopped-veil={stoppedVeilColor}
		aria-label={playing ? '停止' : '再生'}
		onclick={() => onplaybackchange(!playing)}
	>
		{#if !playing}
			<PlaybackIcon name="play-circle" size="4rem" />
		{/if}
	</button>
</div>

<style>
	.surface {
		position: relative;
	}

	button.veil {
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
		box-shadow: none;
		cursor: pointer;
		transition: none;
	}

	button.veil.playing {
		background: transparent;
	}
</style>

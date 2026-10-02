<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlaybackOverlay from './PlaybackOverlay.svelte';

	let {
		playing,
		onplaybackchange,
		transport,
		children
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
		transport: Snippet;
		children: Snippet;
	} = $props();
</script>

<div class="player">
	<PlaybackOverlay {playing} {onplaybackchange}>
		{@render children()}
	</PlaybackOverlay>
	<div class="transport">
		{@render transport()}
	</div>
</div>

<style>
	.player {
		width: 100%;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>

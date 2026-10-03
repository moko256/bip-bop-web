<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { PlaybackContent } from './playback-content';
	import PlaybackOverlay from './PlaybackOverlay.svelte';

	let {
		playing,
		onplaybackchange,
		transport,
		content,
		transportMinHeight
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
		transport: Snippet;
		content: PlaybackContent;
		transportMinHeight?: string;
	} = $props();
</script>

<div class="player">
	<PlaybackOverlay {playing} {onplaybackchange} {content} />
	<div class="transport" style:min-height={transportMinHeight}>
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

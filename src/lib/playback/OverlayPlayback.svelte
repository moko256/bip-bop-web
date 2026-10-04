<script lang="ts">
	import type { PlaybackContent } from './playback-content';
	import PlaybackOverlay from './PlaybackOverlay.svelte';

	let {
		playing,
		onplaybackchange,
		content
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
		content: PlaybackContent;
	} = $props();
</script>

<PlaybackOverlay {playing} {onplaybackchange} {content} />

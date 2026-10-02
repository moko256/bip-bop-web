<script lang="ts">
	import type { PlaybackContent } from './playback-content';
	import PlaybackFrameField from './PlaybackFrameField.svelte';
	import PlaybackShell from './PlaybackShell.svelte';
	import PlaybackToggle from './PlaybackToggle.svelte';

	let {
		playing,
		frame,
		onplaybackchange,
		onframechange,
		content
	}: {
		playing: boolean;
		frame: number;
		onplaybackchange: (playing: boolean) => void;
		onframechange: (frame: number) => void;
		content: PlaybackContent;
	} = $props();
</script>

{#snippet transport()}
	<PlaybackToggle {playing} {onplaybackchange} />
	<PlaybackFrameField {frame} {onframechange} />
{/snippet}

<PlaybackShell {playing} {onplaybackchange} {transport} {content} />

<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlaybackFrameField from './PlaybackFrameField.svelte';
	import PlaybackShell from './PlaybackShell.svelte';
	import PlaybackToggle from './PlaybackToggle.svelte';

	let {
		playing,
		frame,
		onplaybackchange,
		onframechange,
		children
	}: {
		playing: boolean;
		frame: number;
		onplaybackchange: (playing: boolean) => void;
		onframechange: (frame: number) => void;
		children: Snippet;
	} = $props();
</script>

{#snippet transport()}
	<PlaybackToggle {playing} {onplaybackchange} />
	<PlaybackFrameField {frame} {onframechange} />
{/snippet}

<PlaybackShell {playing} {onplaybackchange} {transport} {children} />

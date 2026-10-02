<script lang="ts">
	import type { PlaybackContent } from './playback-content';
	import PlaybackClock from './PlaybackClock.svelte';
	import PlaybackFrameField from './PlaybackFrameField.svelte';
	import PlaybackSeekBar from './PlaybackSeekBar.svelte';
	import PlaybackShell from './PlaybackShell.svelte';
	import PlaybackToggle from './PlaybackToggle.svelte';

	let {
		playing,
		frame,
		maxFrame,
		fps,
		onplaybackchange,
		onframechange,
		content
	}: {
		playing: boolean;
		frame: number;
		maxFrame: number;
		fps: number;
		onplaybackchange: (playing: boolean) => void;
		onframechange: (frame: number) => void;
		content: PlaybackContent;
	} = $props();
</script>

{#snippet transport()}
	<PlaybackToggle {playing} {onplaybackchange} />
	<PlaybackSeekBar {frame} {maxFrame} {onframechange} />
	<PlaybackClock {frame} {maxFrame} {fps} />
	<PlaybackFrameField {frame} {maxFrame} {onframechange} />
{/snippet}

<PlaybackShell {playing} {onplaybackchange} {transport} {content} />

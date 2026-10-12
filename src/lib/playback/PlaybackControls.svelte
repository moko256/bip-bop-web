<script lang="ts">
	import type { PlaybackContent } from './playback-content';
	import type { PlaybackPosition } from './PlaybackSession.svelte';
	import PlaybackTime from './PlaybackTime.svelte';
	import PlaybackFrameField from './PlaybackFrameField.svelte';
	import PlaybackSeekBar from './PlaybackSeekBar.svelte';
	import PlaybackShell from './PlaybackShell.svelte';
	import PlaybackToggle from './PlaybackToggle.svelte';
	import { seekReserveHeight } from './seek-bar';

	let {
		session,
		content
	}: {
		session: PlaybackPosition;
		content: PlaybackContent;
	} = $props();

	let length = $derived(session.maxFrame);
</script>

{#snippet transport()}
	<PlaybackToggle playing={session.playing} onplaybackchange={(next) => session.setPlaying(next)} />
	{#if length !== undefined}
		<PlaybackSeekBar
			frame={session.frame}
			maxFrame={length}
			onframechange={(next) => session.seek(next)}
		/>
		<PlaybackTime frame={session.frame} maxFrame={length} fps={session.fps} />
	{/if}
	<PlaybackFrameField
		frame={session.frame}
		maxFrame={length}
		playing={session.playing}
		onframechange={(next) => session.seek(next)}
	/>
{/snippet}

<PlaybackShell
	playing={session.playing}
	onplaybackchange={(next) => session.setPlaying(next)}
	{transport}
	{content}
	transportMinHeight={length === undefined ? undefined : seekReserveHeight}
/>

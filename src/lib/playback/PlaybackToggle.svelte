<script lang="ts">
	import PlaybackIcon from './PlaybackIcon.svelte';

	let {
		playing,
		onplaybackchange
	}: {
		playing: boolean;
		onplaybackchange: (playing: boolean) => void;
	} = $props();
</script>

<button
	type="button"
	aria-label={playing ? '停止' : '再生'}
	onclick={() => onplaybackchange(!playing)}
>
	<PlaybackIcon name={playing ? 'pause' : 'play-arrow'} size="1.5rem" />
</button>

<style>
	button {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: auto;
		margin: 0;
	}
</style>

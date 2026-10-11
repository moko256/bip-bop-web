<script lang="ts">
	import UnlimitedPlaybackControls from '$lib/playback/UnlimitedPlaybackControls.svelte';
	import BipBopLivePicture from './BipBopLivePicture.svelte';

	let {
		aspectRatio = '16 / 9',
		bitmap = null
	}: {
		aspectRatio?: string;
		/**
		 * Canvas backing store. CSS still sizes the element to the host.
		 * Absent means the host size times devicePixelRatio.
		 */
		bitmap?: { width: number; height: number } | null;
	} = $props();
</script>

<BipBopLivePicture {bitmap} {aspectRatio}>
	{#snippet view({ playing, frame, setPlaying, seek, canvas })}
		<UnlimitedPlaybackControls
			{playing}
			{frame}
			onplaybackchange={setPlaying}
			onframechange={seek}
			content={canvas}
		/>
	{/snippet}
</BipBopLivePicture>

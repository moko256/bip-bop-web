<script lang="ts">
	import PlaybackControls from '#lib/playback/PlaybackControls.svelte';
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
	{#snippet view({ session, canvas })}
		<PlaybackControls {session} content={canvas} />
	{/snippet}
</BipBopLivePicture>

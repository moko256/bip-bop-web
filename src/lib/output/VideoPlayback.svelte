<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		playback,
		controls,
		ongenerate
	}: {
		playback: Promise<string> | null;
		controls: Snippet;
		ongenerate: () => void;
	} = $props();

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message !== '') return error.message;
		return '動画の生成に失敗しました';
	}
</script>

{#snippet placeholder()}
	<div class="media placeholder" role="img" aria-label="動画のプレースホルダー"></div>
{/snippet}

{#snippet actions(pending, error)}
	<button type="button" disabled={pending} onclick={ongenerate}>生成</button>
	{#if error}
		<p role="alert">{error}</p>
	{/if}
{/snippet}

<div class="stage">
	{#if playback}
		{#await playback}
			<div
				class="media placeholder"
				role="img"
				aria-label="動画のプレースホルダー"
				aria-busy="true"
			></div>
		{:then url}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="media"
				src={url}
				controls
				aria-label="生成した動画"
				{@attach () => () => URL.revokeObjectURL(url)}
			></video>
		{:catch _error}
			{@render placeholder()}
		{/await}
	{:else}
		{@render placeholder()}
	{/if}
</div>
{@render controls()}
{#if playback}
	{#await playback}
		{@render actions(true, null)}
	{:then _url}
		{@render actions(false, null)}
	{:catch error}
		{@render actions(false, errorMessage(error))}
	{/await}
{:else}
	{@render actions(false, null)}
{/if}

<style>
	.stage {
		display: grid;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #000;
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}

	.media {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>

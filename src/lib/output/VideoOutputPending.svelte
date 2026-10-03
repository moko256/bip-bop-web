<script lang="ts">
	import type { Snippet } from 'svelte';
	import { seekBarHeight } from '$lib/playback/seek-bar';
	import * as m from '$lib/paraglide/messages';
	import OutputLayout from './OutputLayout.svelte';
	import { defaultResolution, parseResolution } from './output';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();

	const bitmap = parseResolution(defaultResolution);
	const videoAspectRatio = `${bitmap.width} / ${bitmap.height}`;
</script>

<OutputLayout>
	{#snippet media()}
		<div class="stage">
			<div class="viewport" style:aspect-ratio={videoAspectRatio}>
				<progress aria-label={m.loading_video_output_aria()}></progress>
			</div>
			<div class="seek-reserve" style:height={seekBarHeight} aria-hidden="true"></div>
		</div>
	{/snippet}
	{#snippet settings()}
		{@render outputTypeSelector()}
	{/snippet}
</OutputLayout>

<style>
	.stage {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.viewport {
		display: grid;
		width: 100%;
		min-width: 0;
		background: #000;
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}

	.viewport > progress {
		place-self: center;
		width: 40%;
		margin: 0;
	}

	.seek-reserve {
		flex-shrink: 0;
		width: 100%;
	}
</style>

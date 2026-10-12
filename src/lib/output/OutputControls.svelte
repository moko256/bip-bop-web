<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import type { Snippet } from 'svelte';
	import * as m from '#lib/paraglide/messages';
	import { loadVideoOutput } from './load-video-output';
	import { isVideoOutputType, outputTypes, type OutputType } from './output';
	import OutputLayout from './OutputLayout.svelte';
	import PageOutput from './PageOutput.svelte';
	import VideoOutputPending from './VideoOutputPending.svelte';

	let outputType = $state<OutputType>('page');
	let videoOutput: ReturnType<typeof loadVideoOutput> | undefined;

	function unexpectedOutputType(type: never): never {
		throw new Error(`Unknown output type: ${String(type)}`);
	}

	function loadEncoder() {
		videoOutput ??= loadVideoOutput();
		return videoOutput;
	}

	function outputTypeLabel(type: OutputType): string {
		switch (type) {
			case 'page':
				return m.output_type_page();
			case 'mp4':
				return 'mp4';
			case 'webm':
				return 'webm';
			case 'fullscreen-url':
				return m.output_type_fullscreen_url();
		}
	}
</script>

{#snippet layout(picture: Snippet, fields: Snippet)}
	<OutputLayout>
		{#snippet media()}
			{@render picture()}
		{/snippet}
		{#snippet settings()}
			<h1>{m.site_title()}</h1>

			<div class="output-type-switcher" role="group" aria-label={m.output_type_group_aria_label()}>
				{#each outputTypes as type (type)}
					<button
						type="button"
						class={outputType === type ? undefined : 'outline'}
						aria-current={outputType === type ? true : undefined}
						onclick={() => {
							outputType = type;
						}}
					>
						{outputTypeLabel(type)}
					</button>
				{/each}
			</div>

			{@render fields()}
		{/snippet}
	</OutputLayout>
{/snippet}

{#if isVideoOutputType(outputType)}
	{#await loadEncoder()}
		<VideoOutputPending {layout} />
	{:then { default: VideoOutput }}
		<VideoOutput {outputType} {layout} />
	{/await}
{:else if outputType === 'fullscreen-url'}
	<FullscreenUrlOutput {layout} />
{:else if outputType === 'page'}
	<PageOutput {layout} />
{:else}
	{unexpectedOutputType(outputType)}
{/if}

<style>
	.output-type-switcher {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		width: 100%;
		margin-bottom: 0;
		border-radius: 0;
		box-shadow: none;
		vertical-align: baseline;
	}

	.output-type-switcher > :global(button) {
		flex: 1 1 calc(50% - 0.25rem);
		width: auto;
		min-width: 0;
		margin: 0;
		border-radius: var(--pico-border-radius);
	}
</style>

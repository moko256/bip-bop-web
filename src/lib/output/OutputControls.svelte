<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import { isVideoOutputType, outputTypeLabels, outputTypes, type OutputType } from './output';
	import PageOutput from './PageOutput.svelte';

	let outputType = $state<OutputType>('page');
</script>

{#snippet outputTypeSelector()}
	<div class="output-type-switcher" role="group" aria-label="OutputType">
		{#each outputTypes as type (type)}
			<button
				type="button"
				class={outputType === type ? undefined : 'outline'}
				aria-current={outputType === type ? true : undefined}
				onclick={() => {
					outputType = type;
				}}
			>
				{outputTypeLabels[type]}
			</button>
		{/each}
	</div>
{/snippet}

{#if isVideoOutputType(outputType)}
	{#await import('./VideoOutput.svelte') then { default: VideoOutput }}
		<VideoOutput {outputType} {outputTypeSelector} />
	{/await}
{:else if outputType === 'fullscreen-url'}
	<FullscreenUrlOutput {outputTypeSelector} />
{:else}
	<PageOutput {outputTypeSelector} />
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

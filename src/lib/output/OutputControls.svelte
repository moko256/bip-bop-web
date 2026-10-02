<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import { isVideoOutputType, outputTypeLabels, outputTypes, type OutputType } from './output';
	import PageOutput from './PageOutput.svelte';
	import VideoOutput from './VideoOutput.svelte';

	let outputType = $state<OutputType>('page');
</script>

{#snippet outputTypeSelector()}
	<div role="group" aria-label="OutputType">
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
	<VideoOutput {outputType} {outputTypeSelector} />
{:else if outputType === 'fullscreen-url'}
	<FullscreenUrlOutput {outputTypeSelector} />
{:else}
	<PageOutput {outputTypeSelector} />
{/if}

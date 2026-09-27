<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import { isVideoOutputType, outputTypeLabels, outputTypes, type OutputType } from './output';
	import PageOutput from './PageOutput.svelte';
	import VideoOutput from './VideoOutput.svelte';

	let outputType = $state<OutputType>('page');
</script>

{#snippet outputTypeSelector()}
	<fieldset aria-label="OutputType">
		{#each outputTypes as type (type)}
			<label>
				<input type="radio" name="output-type" value={type} bind:group={outputType} />
				{outputTypeLabels[type]}
			</label>
		{/each}
	</fieldset>
{/snippet}

{#if isVideoOutputType(outputType)}
	<VideoOutput {outputType} {outputTypeSelector} />
{:else if outputType === 'fullscreen-url'}
	<FullscreenUrlOutput {outputTypeSelector} />
{:else}
	<PageOutput {outputTypeSelector} />
{/if}

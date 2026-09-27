<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import { outputCategory, outputTypeLabels, outputTypes, type OutputType } from './output';
	import VideoOutput from './VideoOutput.svelte';

	let outputType = $state<OutputType>('page');
	let category = $derived(outputCategory(outputType));
</script>

<fieldset aria-label="OutputType">
	{#each outputTypes as type (type)}
		<label>
			<input type="radio" name="output-type" value={type} bind:group={outputType} />
			{outputTypeLabels[type]}
		</label>
	{/each}
</fieldset>

{#if category === 'video'}
	<VideoOutput />
{:else if category === 'fullscreen-url'}
	<FullscreenUrlOutput />
{/if}

<script lang="ts">
	import FullscreenUrlOutput from './FullscreenUrlOutput.svelte';
	import { outputCategory, outputTypeLabels, outputTypes, type OutputType } from './output';
	import VideoOutput from './VideoOutput.svelte';

	let outputType = $state<OutputType>('page');
	let category = $derived(outputCategory(outputType));
</script>

<fieldset aria-label="OutputType">
	{#each outputTypes as type (type)}
		<input
			type="radio"
			id="output-type-{type}"
			name="output-type"
			value={type}
			bind:group={outputType}
		/>
		<label for="output-type-{type}">{outputTypeLabels[type]}</label>
	{/each}
</fieldset>

{#if category === 'video'}
	<VideoOutput />
{:else if category === 'fullscreen-url'}
	<FullscreenUrlOutput />
{/if}

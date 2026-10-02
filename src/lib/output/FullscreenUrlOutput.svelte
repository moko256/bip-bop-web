<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import OutputLayout from './OutputLayout.svelte';
	import type { Snippet } from 'svelte';
	import ResolutionSelect from './ResolutionSelect.svelte';
	import { defaultResolution, type Resolution } from './output';
	import * as m from '$lib/paraglide/messages';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();

	let resolution = $state<Resolution>(defaultResolution);
</script>

<OutputLayout>
	{#snippet media()}
		<BipBopPreview />
	{/snippet}
	{#snippet settings()}
		{@render outputTypeSelector()}
		<div class="output-fields">
			<ResolutionSelect bind:value={resolution} />
		</div>
		<label>
			{m.url_label()}
			<input type="url" readonly placeholder={m.url_label()} />
		</label>
		<button type="button">{m.copy()}</button>
		<button type="button">{m.open()}</button>
	{/snippet}
</OutputLayout>

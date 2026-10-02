<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import OutputLayout from './OutputLayout.svelte';
	import type { Snippet } from 'svelte';
	import { resolutions } from './output';
	import * as m from '$lib/paraglide/messages';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();
</script>

<OutputLayout>
	{#snippet media()}
		<BipBopPreview />
	{/snippet}
	{#snippet settings()}
		{@render outputTypeSelector()}
		<div class="output-fields">
			<label>
				{m.resolution()}
				<select>
					{#each resolutions as resolution (resolution.value)}
						<option value={resolution.value}>{resolution.label}</option>
					{/each}
				</select>
			</label>
		</div>
		<label>
			{m.url_label()}
			<input type="url" readonly placeholder={m.url_label()} />
		</label>
		<button type="button">{m.copy()}</button>
		<button type="button">{m.open()}</button>
	{/snippet}
</OutputLayout>

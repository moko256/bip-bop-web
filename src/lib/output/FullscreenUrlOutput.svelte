<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import type { Snippet } from 'svelte';
	import { resolutions } from './output';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();
</script>

<BipBopPreview />
{@render outputTypeSelector()}
<label>
	解像度
	<select>
		{#each resolutions as resolution (resolution.value)}
			<option value={resolution.value}>{resolution.label}</option>
		{/each}
	</select>
</label>
<label>
	URL
	<input type="url" readonly placeholder="URL" />
</label>
<button type="button">コピー</button>
<button type="button">開く</button>

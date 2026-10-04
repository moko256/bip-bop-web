<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import { m } from '$lib/paraglide/messages';
	import OutputLayout from './OutputLayout.svelte';
	import type { Snippet } from 'svelte';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();
</script>

<OutputLayout>
	{#snippet media()}
		<BipBopPreview />
	{/snippet}
	{#snippet settings()}
		{@render outputTypeSelector()}

		<p>{m.site_description()}</p>
	{/snippet}
</OutputLayout>

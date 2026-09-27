<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import type { Snippet } from 'svelte';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();
</script>

<BipBopPreview />
{@render outputTypeSelector()}

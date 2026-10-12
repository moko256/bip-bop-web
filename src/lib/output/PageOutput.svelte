<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import { m } from '$lib/paraglide/messages';
	import type { OutputLayoutPlace } from './output-layout';

	let { layout }: { layout: OutputLayoutPlace } = $props();
</script>

{#snippet media()}
	<BipBopPreview />
{/snippet}

{#snippet settings()}
	<p>{m.site_description()}</p>
{/snippet}

{@render layout(media, settings)}

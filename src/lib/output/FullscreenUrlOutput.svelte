<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import { fullscreenPageUrl } from '$lib/fullscreen/fullscreen-url';
	import { currentPageAbsoluteUrl } from '$lib/site-url-resolver';
	import type { Snippet } from 'svelte';
	import { parseResolution, resolutionGroups, type Resolution } from './output';
	import OutputLayout from './OutputLayout.svelte';
	import * as m from '$lib/paraglide/messages';

	let { outputTypeSelector }: { outputTypeSelector: Snippet } = $props();

	let resolution = $state<Resolution | ''>('');
	let href = $derived(
		fullscreenPageUrl(currentPageAbsoluteUrl(), resolution === '' ? null : resolution).href
	);
	let aspectRatio = $derived.by(() => {
		if (resolution === '') return '16 / 9';
		const bitmap = parseResolution(resolution);
		return `${bitmap.width} / ${bitmap.height}`;
	});

	function copyHref() {
		void navigator.clipboard.writeText(href).catch(() => {});
	}
</script>

<OutputLayout>
	{#snippet media()}
		<BipBopPreview {aspectRatio} />
	{/snippet}
	{#snippet settings()}
		{@render outputTypeSelector()}
		<div class="output-fields">
			<label>
				{m.resolution()}
				<select bind:value={resolution}>
					<option value="">{m.window_size()}</option>
					{#each resolutionGroups as group (group.id)}
						<optgroup label={group.label}>
							{#each group.options as option (option.value)}
								<option value={option.value}>{option.label}</option>
							{/each}
						</optgroup>
					{/each}
				</select>
			</label>
		</div>
		<button type="button" onclick={copyHref}>{m.copy()}</button>
		<!-- The href is an absolute URL built for this page, including the production host while prerendering. -->
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a {href} target="_blank" rel="noopener noreferrer">{href}</a>
	{/snippet}
</OutputLayout>

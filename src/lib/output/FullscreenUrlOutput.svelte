<script lang="ts">
	import BipBopPreview from '$lib/bip-bop/BipBopPreview.svelte';
	import { fullscreenPageUrl } from '$lib/fullscreen/fullscreen-url';
	import { currentPageAbsoluteUrl } from '$lib/site-url-resolver';
	import type { OutputLayoutPlace } from './output-layout';
	import { parseResolution, resolutionGroups, type Resolution } from './output';
	import * as m from '$lib/paraglide/messages';

	let { layout }: { layout: OutputLayoutPlace } = $props();

	let resolution = $state<Resolution | ''>('');
	let href = $derived(
		fullscreenPageUrl(currentPageAbsoluteUrl(), resolution === '' ? null : resolution).href
	);
	let bitmap = $derived(resolution === '' ? null : parseResolution(resolution));
	let aspectRatio = $derived(bitmap === null ? '16 / 9' : `${bitmap.width} / ${bitmap.height}`);

	function copyHref() {
		void navigator.clipboard.writeText(href).catch(() => {});
	}
</script>

{#snippet media()}
	<BipBopPreview {aspectRatio} {bitmap} />
{/snippet}

{#snippet settings()}
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

{@render layout(media, settings)}

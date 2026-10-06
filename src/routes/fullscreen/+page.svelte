<script lang="ts">
	import ThemeColor from '$lib/components/ThemeColor.svelte';
	import FullscreenPicture from '$lib/fullscreen/FullscreenPicture.svelte';
	import {
		fullscreenDocumentTitle,
		parseFullscreenResolution,
		type FullscreenBitmap
	} from '$lib/fullscreen/fullscreen-url';
	import { m } from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	// Prerender has no query string. The bitmap and title are chosen after the page opens.
	let bitmap = $state<FullscreenBitmap | null>(null);
	let ready = $state(false);
	let title = $derived(fullscreenDocumentTitle(m.site_title(), bitmap));

	onMount(() => {
		bitmap = parseFullscreenResolution(page.url.searchParams.get('resolution'));
		ready = true;
	});
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<ThemeColor light="#000000" dark="#000000" />

{#if ready}
	<FullscreenPicture {bitmap} />
{:else}
	<div class="fullscreen-boot"></div>
{/if}

<style>
	:global(html),
	:global(body) {
		margin: 0;
		background: #000;
	}

	.fullscreen-boot {
		width: 100%;
		height: 100dvh;
		background: #000;
	}
</style>

<script lang="ts">
	import icon_svg from '$lib/assets/icons/icon.svg';
	import { asset } from '$app/paths';
	import { applyDocumentLocale } from '$lib/html-lang';
	import { getLocale } from '$lib/paraglide/runtime';
	import { page } from '$app/state';

	let { children } = $props();
</script>

<svelte:document
	{@attach (doc) => {
		void page.url;
		applyDocumentLocale(doc.documentElement, getLocale());
	}}
/>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="text-scale" content="scale" />

	<link rel="icon" href={asset('/favicon.ico')} sizes="16x16" />
	<link rel="icon" href={icon_svg} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={asset('/icons/apple-touch-icon.png')} />
</svelte:head>
{@render children()}

<script lang="ts">
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import icon_svg from '$lib/assets/icons/icon.svg';
	import { asset } from '$app/paths';

	let { children } = $props();
</script>

<svelte:head>
	<title>{m.site_title()}</title>
	<meta name="description" content={m.site_description()} />

	<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#13171f" media="(prefers-color-scheme: dark)" />

	<link rel="icon" href={asset('/favicon.ico')} sizes="16x16" />
	<link rel="icon" href={icon_svg} type="image/svg+xml" />
	<link rel="apple-touch-icon" href={asset('/icons/apple-touch-icon.png')} />
</svelte:head>
{@render children()}

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>

<style>
	@import 'kiso.css';
	@import '$lib/styles/pico.scss';
</style>

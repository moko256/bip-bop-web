<script lang="ts">
	import HeadUrlLinks from '$lib/components/HeadUrlLinks.svelte';
	import LocaleAnchor from '$lib/components/LocaleAnchor.svelte';
	import NoScript from '$lib/components/NoScript.svelte';
	import OutputControls from '$lib/output/OutputControls.svelte';
	import { m } from '$lib/paraglide/messages';
	import Footer from '$lib/top/Footer.svelte';
</script>

<svelte:head>
	<title>{m.site_title()}</title>
	<meta name="description" content={m.site_description()} />

	<HeadUrlLinks />
</svelte:head>

<LocaleAnchor />

<main class="container main-container">
	<NoScript />

	<OutputControls />

	<Footer />
</main>

<style>
	@import 'kiso.css';
	@import '$lib/styles/pico.scss';

	.main-container {
		display: grid;
		grid-template-rows: 1fr auto;
		min-height: 100vh;
		min-height: 100dvh;
	}
</style>

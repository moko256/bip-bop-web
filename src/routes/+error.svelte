<script lang="ts">
	import ThemeColor from '$lib/components/ThemeColor.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	// SvelteKit evaluates this module on every page. Static CSS here would
	// follow that import onto /fullscreen, so load the sheets only when this
	// page is shown.
	void import('kiso.css');
	void import('$lib/styles/pico.scss');
</script>

<ThemeColor light="#ffffff" dark="#13171f" />

<main class="container">
	<h1>{page.status} {page.error?.message}</h1>
	<a href={resolve('/')}>Back to TOP</a>
</main>

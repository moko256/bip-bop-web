<script lang="ts">
	import ThemeColor from '$lib/components/ThemeColor.svelte';
	import { picoThemeColors } from '$lib/styles/pico-theme-colors';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
</script>

<ThemeColor {...picoThemeColors} />

<main class="container">
	<h1>{page.status} {page.error?.message}</h1>
	<a href={resolve('/')}>Back to TOP</a>
</main>

<style>
	@import 'kiso.css';
	@import '$lib/styles/pico.scss';
</style>

<script lang="ts">
	let { light, dark }: { light: string; dark: string } = $props();
</script>

<svelte:head>
	<meta name="theme-color" content={light} media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content={dark} media="(prefers-color-scheme: dark)" />
</svelte:head>

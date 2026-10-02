<script lang="ts">
	import type { Snippet } from 'svelte';

	let { media, settings }: { media: Snippet; settings: Snippet } = $props();
</script>

<div class="output-layout">
	<div class="media">
		{@render media()}
	</div>
	<div class="settings">
		{@render settings()}
	</div>
</div>

<style>
	.output-layout {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.media {
		width: 100%;
		min-width: 0;
	}

	.settings {
		display: flex;
		flex-direction: column;
		gap: var(--pico-spacing, 1rem);
		width: 100%;
	}

	.settings :global(.output-fields) {
		display: flex;
		flex-direction: column;
		gap: var(--pico-spacing, 1rem);
	}

	.settings :global(.output-fields > label) {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin: 0;
	}

	@media (min-width: 721px) {
		.output-layout {
			flex-direction: row;
			align-items: stretch;
		}

		.media {
			flex: 1 1 0;
		}

		.settings {
			flex: 0 1 25%;
			width: auto;
			min-width: 360px;
			max-width: 25%;
		}
	}
</style>

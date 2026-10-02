<script lang="ts">
	let {
		frame,
		maxFrame
	}: {
		frame: number;
		maxFrame: number;
	} = $props();
</script>

<progress max={maxFrame} value={frame} aria-label="再生位置"></progress>

<style>
	progress {
		flex: 1 1 auto;
		width: auto;
		min-width: 0;
		margin: 0;
	}
</style>

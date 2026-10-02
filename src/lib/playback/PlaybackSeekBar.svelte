<script lang="ts">
	import { seekBarHeight } from './seek-bar';

	let {
		frame,
		maxFrame
	}: {
		frame: number;
		maxFrame: number;
	} = $props();
</script>

<progress style:height={seekBarHeight} max={maxFrame} value={frame} aria-label="再生位置"
></progress>

<style>
	progress {
		box-sizing: border-box;
		flex: 1 1 auto;
		width: auto;
		min-width: 0;
		margin: 0;
		border: 0;
	}
</style>

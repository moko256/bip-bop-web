<script lang="ts">
	import { formatPlaybackTime } from './time';

	let {
		frame,
		maxFrame,
		fps
	}: {
		frame: number;
		maxFrame: number;
		fps: number;
	} = $props();

	let clock = $derived(formatPlaybackTime(frame, maxFrame, fps));
</script>

<span class="clock">{clock}</span>

<style>
	.clock {
		flex: 0 0 auto;
		margin: 0;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>

<script lang="ts">
	import { clampFrame } from './time';

	let {
		frame,
		maxFrame,
		onframechange
	}: {
		frame: number;
		maxFrame?: number;
		onframechange: (frame: number) => void;
	} = $props();

	function onFrameInput(event: Event) {
		const next = (event.currentTarget as HTMLInputElement).valueAsNumber;
		if (!Number.isFinite(next)) return;
		onframechange(clampFrame(next, maxFrame));
	}
</script>

<input
	type="number"
	min="0"
	max={maxFrame}
	step="1"
	value={frame}
	aria-label="フレーム"
	oninput={onFrameInput}
/>

<style>
	input[type='number'] {
		flex: 0 0 auto;
		width: 7rem;
		margin: 0;
	}
</style>

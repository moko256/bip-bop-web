<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { clampFrame } from './time';

	let {
		frame,
		maxFrame,
		playing = false,
		onframechange
	}: {
		frame: number;
		maxFrame?: number;
		playing?: boolean;
		onframechange: (frame: number) => void;
	} = $props();

	// Playback already paints the frame on the picture. The field stays blank
	// so the number does not rewrite the DOM on every frame.
	let shown = $derived(playing ? '' : frame);

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
	value={shown}
	disabled={playing}
	aria-label={m.frame_aria()}
	oninput={onFrameInput}
/>

<style>
	input[type='number'] {
		flex: 0 0 auto;
		width: 7rem;
		margin: 0;
	}
</style>

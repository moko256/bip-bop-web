<script lang="ts">
	import { pausePath, playArrowPath, playCirclePath } from './icons';

	let {
		name,
		size
	}: {
		name: 'play-circle' | 'play-arrow' | 'pause';
		size: string;
	} = $props();

	let path = $derived(
		name === 'play-circle' ? playCirclePath : name === 'play-arrow' ? playArrowPath : pausePath
	);
</script>

<svg viewBox="0 0 24 24" style:width={size} style:height={size} aria-hidden="true">
	<path d={path} />
</svg>

<style>
	svg {
		display: block;
		fill: currentColor;
	}
</style>

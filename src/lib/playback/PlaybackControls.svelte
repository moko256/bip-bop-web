<script lang="ts">
	import type { Snippet } from 'svelte';
	import PlaybackIcon from './PlaybackIcon.svelte';
	import PlaybackOverlay from './PlaybackOverlay.svelte';
	import { clampFrame, formatPlaybackTime } from './time';

	let {
		playing,
		frame,
		maxFrame,
		fps,
		onplaybackchange,
		onframechange,
		children
	}: {
		playing: boolean;
		frame: number;
		maxFrame: number;
		fps: number;
		onplaybackchange: (playing: boolean) => void;
		onframechange: (frame: number) => void;
		children: Snippet;
	} = $props();

	let clock = $derived(formatPlaybackTime(frame, maxFrame, fps));

	function onFrameInput(event: Event) {
		const next = (event.currentTarget as HTMLInputElement).valueAsNumber;
		if (!Number.isFinite(next)) return;
		onframechange(clampFrame(next, maxFrame));
	}
</script>

<div class="player">
	<PlaybackOverlay {playing} {onplaybackchange}>
		{@render children()}
	</PlaybackOverlay>
	<div class="transport">
		<button
			type="button"
			aria-label={playing ? '停止' : '再生'}
			onclick={() => onplaybackchange(!playing)}
		>
			<PlaybackIcon name={playing ? 'pause' : 'play-arrow'} size="1.5rem" />
		</button>
		<progress max={maxFrame} value={frame} aria-label="再生位置"></progress>
		<span class="clock">{clock}</span>
		<input
			type="number"
			min="0"
			max={maxFrame}
			step="1"
			value={frame}
			aria-label="フレーム"
			oninput={onFrameInput}
		/>
	</div>
</div>

<style>
	.player {
		width: 100%;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.transport > button {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		width: auto;
		margin: 0;
	}

	.transport progress {
		flex: 1 1 auto;
		width: auto;
		min-width: 0;
		margin: 0;
	}

	.clock {
		flex: 0 0 auto;
		margin: 0;
		font-family: monospace;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}

	.transport input[type='number'] {
		flex: 0 0 auto;
		width: 7rem;
		margin: 0;
	}
</style>

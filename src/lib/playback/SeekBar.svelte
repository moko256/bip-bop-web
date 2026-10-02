<script lang="ts">
	import { clampFrame } from './time';

	let {
		frame,
		maxFrame,
		onframechange
	}: {
		frame: number;
		maxFrame: number;
		onframechange: (frame: number) => void;
	} = $props();

	// The hot knob is 24px. The area stays that tall, and pads the bar by half of
	// that knob, so the enlarged knob stays inside the area at either end.
	let dragging = $state(false);
	let ratio = $derived(maxFrame > 0 ? frame / maxFrame : 0);

	function trackFrom(event: Event): HTMLElement | null {
		const surface = event.currentTarget;
		if (!(surface instanceof HTMLElement)) return null;
		const track = surface.querySelector('.bar');
		return track instanceof HTMLElement ? track : null;
	}

	function frameAt(clientX: number, track: HTMLElement): number {
		const rect = track.getBoundingClientRect();
		if (rect.width <= 0) return 0;
		const next = Math.round(((clientX - rect.left) / rect.width) * maxFrame);
		return clampFrame(next, maxFrame);
	}

	function isKnob(target: EventTarget | null): boolean {
		return target instanceof Element && target.closest('.knob') !== null;
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		const surface = event.currentTarget;
		const track = trackFrom(event);
		if (!(surface instanceof HTMLElement) || !track) return;
		if (isKnob(event.target)) {
			dragging = true;
			if (event.isTrusted) surface.setPointerCapture(event.pointerId);
		} else {
			onframechange(frameAt(event.clientX, track));
		}
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		const track = trackFrom(event);
		if (!track) return;
		onframechange(frameAt(event.clientX, track));
	}

	function onPointerUp(event: PointerEvent) {
		if (!dragging) return;
		dragging = false;
		const surface = event.currentTarget;
		if (!(surface instanceof HTMLElement) || !event.isTrusted) return;
		if (!surface.hasPointerCapture(event.pointerId)) return;
		surface.releasePointerCapture(event.pointerId);
	}

	function onKeyDown(event: KeyboardEvent) {
		const step =
			event.key === 'ArrowRight' || event.key === 'ArrowUp'
				? 1
				: event.key === 'ArrowLeft' || event.key === 'ArrowDown'
					? -1
					: event.key === 'Home'
						? -frame
						: event.key === 'End'
							? maxFrame - frame
							: null;
		if (step === null) return;
		event.preventDefault();
		onframechange(clampFrame(frame + step, maxFrame));
	}
</script>

<div
	class={['seek', { dragging }]}
	style:--ratio={ratio}
	role="slider"
	tabindex="0"
	aria-label="再生位置"
	aria-orientation="horizontal"
	aria-valuemin="0"
	aria-valuemax={maxFrame}
	aria-valuenow={frame}
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeyDown}
>
	<div class="bar"></div>
	<div class="knob"></div>
</div>

<style>
	.seek {
		--knob-rest: 16px;
		--knob-hot: 24px;
		--bar-rest: 4px;
		--bar-hot: 6px;
		--pad: calc(var(--knob-hot) / 2);

		position: relative;
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		box-sizing: border-box;
		width: auto;
		min-width: 0;
		height: var(--knob-hot);
		margin: 0;
		padding-inline: var(--pad);
		touch-action: none;
		cursor: pointer;
		user-select: none;
	}

	.seek:focus-visible {
		outline: 2px solid var(--pico-primary, #2060df);
		outline-offset: 2px;
	}

	.bar {
		width: 100%;
		height: var(--bar-rest);
		border-radius: 999px;
		background: linear-gradient(
			to right,
			var(--pico-primary, #2060df) calc(var(--ratio) * 100%),
			var(--pico-progress-background-color, #dfe3eb) calc(var(--ratio) * 100%)
		);
		transition: height var(--pico-transition, 0.2s ease-in-out);
	}

	.seek:hover .bar,
	.seek.dragging .bar {
		height: var(--bar-hot);
	}

	.knob {
		position: absolute;
		top: 50%;
		left: calc(var(--pad) + (100% - 2 * var(--pad)) * var(--ratio));
		width: var(--knob-rest);
		height: var(--knob-rest);
		border-radius: 50%;
		background: var(--pico-primary, #2060df);
		transform: translate(-50%, -50%);
		cursor: grab;
		transition:
			width var(--pico-transition, 0.2s ease-in-out),
			height var(--pico-transition, 0.2s ease-in-out);
	}

	.seek:hover .knob,
	.seek.dragging .knob {
		width: var(--knob-hot);
		height: var(--knob-hot);
		cursor: grabbing;
	}
</style>

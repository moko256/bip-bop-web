<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { VideoCodec } from 'mediabunny';
	import { tick, type Snippet } from 'svelte';
	import { generateBipBopVideo } from './generate-video';
	import { parseResolution, type Resolution, type VideoOutputType } from './output';

	let {
		outputType,
		codec,
		resolution,
		controls
	}: {
		outputType: VideoOutputType;
		codec: VideoCodec;
		resolution: Resolution;
		controls: Snippet;
	} = $props();

	let generating = $state(false);
	let videoUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	let alive = true;
	const abort = new AbortController();

	const releaseUrls: Attachment<HTMLDivElement> = () => {
		return () => {
			alive = false;
			abort.abort();
			if (videoUrl) URL.revokeObjectURL(videoUrl);
		};
	};

	function messageFrom(error: unknown): string {
		if (error instanceof Error && error.message !== '') return error.message;
		return '動画の生成に失敗しました';
	}

	async function generate() {
		const size = parseResolution(resolution);
		generating = true;
		errorMessage = null;
		try {
			const blob = await generateBipBopVideo({
				outputType,
				codec,
				width: size.width,
				height: size.height,
				signal: abort.signal
			});
			if (!alive || abort.signal.aborted) return;
			const nextUrl = URL.createObjectURL(blob);
			const previousUrl = videoUrl;
			videoUrl = nextUrl;
			await tick();
			if (previousUrl) URL.revokeObjectURL(previousUrl);
		} catch (error) {
			if (!alive || abort.signal.aborted) return;
			if (error instanceof DOMException && error.name === 'AbortError') return;
			errorMessage = messageFrom(error);
		} finally {
			if (alive && !abort.signal.aborted) generating = false;
		}
	}
</script>

<div class="stage" {@attach releaseUrls}>
	{#if videoUrl}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video class="media" src={videoUrl} controls aria-label="生成した動画"></video>
	{:else}
		<div class="media placeholder" role="img" aria-label="動画のプレースホルダー"></div>
	{/if}
</div>
{@render controls()}
<button type="button" disabled={generating} onclick={generate}>生成</button>
{#if errorMessage}
	<p role="alert">{errorMessage}</p>
{/if}

<style>
	.stage {
		display: grid;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: #000;
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}

	.media {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
</style>

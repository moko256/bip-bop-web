<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { VideoCodec } from 'mediabunny';
	import type { Snippet } from 'svelte';
	import { generatePlayback } from './generate-video';
	import {
		resolutions,
		supportedVideoCodecs,
		type Resolution,
		type VideoOutputType
	} from './output';

	let {
		outputType,
		outputTypeSelector
	}: {
		outputType: VideoOutputType;
		outputTypeSelector: Snippet;
	} = $props();

	let resolution = $state<Resolution>('1920x1080');
	let codecChoice = $state<VideoCodec | null>(null);
	let playback = $state<Promise<string> | null>(null);

	let codecs = $derived(supportedVideoCodecs(outputType));
	let codec = $derived(
		codecChoice !== null && codecs.includes(codecChoice) ? codecChoice : codecs[0]
	);

	let abort = new AbortController();

	function invalidate() {
		abort.abort();
		abort = new AbortController();
		playback = null;
	}

	function start() {
		playback = generatePlayback({
			outputType,
			codec,
			resolution,
			signal: abort.signal
		});
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => abort.abort();
	};

	function onCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const match = codecs.find((item) => item === value);
		if (match) codecChoice = match;
	}

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message !== '') return error.message;
		return '動画の生成に失敗しました';
	}
</script>

{#snippet placeholder()}
	<div class="media placeholder" role="img" aria-label="動画のプレースホルダー"></div>
{/snippet}

{#snippet actions(pending: boolean)}
	<button type="button" disabled={pending} onclick={start}>生成</button>
{/snippet}

<div class="stage" {@attach release}>
	{#if playback}
		{#await playback}
			<div
				class="media placeholder"
				role="img"
				aria-label="動画のプレースホルダー"
				aria-busy="true"
			></div>
		{:then url}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video
				class="media"
				src={url}
				controls
				aria-label="生成した動画"
				{@attach () => () => URL.revokeObjectURL(url)}
			></video>
		{:catch}
			{@render placeholder()}
		{/await}
	{:else}
		{@render placeholder()}
	{/if}
</div>
<div onchange={invalidate}>
	{@render outputTypeSelector()}
	<div class="grid">
		<label>
			解像度
			<select bind:value={resolution}>
				{#each resolutions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</label>
		<label>
			ビデオコーデック
			<select value={codec} onchange={onCodecChange}>
				{#each codecs as codecOption (codecOption)}
					<option value={codecOption}>{codecOption}</option>
				{/each}
			</select>
		</label>
	</div>
</div>
{#if playback}
	{#await playback}
		{@render actions(true)}
	{:then}
		{@render actions(false)}
	{:catch error}
		{@render actions(false)}
		<p role="alert">{errorMessage(error)}</p>
	{/await}
{:else}
	{@render actions(false)}
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

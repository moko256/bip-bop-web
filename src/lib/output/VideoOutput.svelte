<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { AudioCodec, VideoCodec } from 'mediabunny';
	import { getFirstEncodableAudioCodec, Quality } from 'mediabunny';
	import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
	import type { Snippet } from 'svelte';
	import { generatePlayback } from './generate-video';
	import {
		resolutions,
		supportedAudioCodecs,
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
	let videoCodecChoice = $state<VideoCodec | null>(null);
	let audioCodecChoice = $state<AudioCodec | null>(null);
	let defaultAudioCodec = $state<AudioCodec | null>(null);
	let playback = $state<Promise<string> | null>(null);

	let videoCodecs = $derived(supportedVideoCodecs(outputType));
	let videoCodec = $derived(
		videoCodecChoice !== null && videoCodecs.includes(videoCodecChoice)
			? videoCodecChoice
			: videoCodecs[0]
	);
	let audioCodecs = $derived(supportedAudioCodecs(outputType));
	let audioCodec = $derived(
		audioCodecChoice !== null && audioCodecs.includes(audioCodecChoice)
			? audioCodecChoice
			: (defaultAudioCodec ?? audioCodecs[0])
	);

	$effect(() => {
		const type = outputType;
		const options = supportedAudioCodecs(type);
		let canceled = false;
		void getFirstEncodableAudioCodec(options, {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
			quality: new Quality('high')
		}).then((match) => {
			if (!canceled && type === outputType) defaultAudioCodec = match;
		});
		return () => {
			canceled = true;
		};
	});

	let abort = new AbortController();

	function invalidate() {
		abort.abort();
		abort = new AbortController();
		playback = null;
	}

	function start() {
		playback = generatePlayback({
			outputType,
			codec: videoCodec,
			audioCodec,
			resolution,
			signal: abort.signal
		});
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => abort.abort();
	};

	function onVideoCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const match = videoCodecs.find((item) => item === value);
		if (match) videoCodecChoice = match;
	}

	function onAudioCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const match = audioCodecs.find((item) => item === value);
		if (match) audioCodecChoice = match;
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
			{@render placeholder()}
			<progress aria-label="生成中"></progress>
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
			<select value={videoCodec} onchange={onVideoCodecChange}>
				{#each videoCodecs as videoCodecOption (videoCodecOption)}
					<option value={videoCodecOption}>{videoCodecOption}</option>
				{/each}
			</select>
		</label>
		<label>
			オーディオコーデック
			<select value={audioCodec} onchange={onAudioCodecChange}>
				{#each audioCodecs as audioCodecOption (audioCodecOption)}
					<option value={audioCodecOption}>{audioCodecOption}</option>
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

	.stage > progress {
		grid-area: 1 / 1;
		place-self: center;
		width: 40%;
		margin: 0;
	}
</style>

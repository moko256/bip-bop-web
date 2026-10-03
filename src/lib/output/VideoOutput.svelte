<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { AudioCodec, VideoCodec } from 'mediabunny';
	import BipBopStill from '$lib/bip-bop/BipBopStill.svelte';
	import { BIP_BOP_FPS, BIP_BOP_MAX_FRAME } from '$lib/bip-bop/timeline';
	import type { Snippet } from 'svelte';
	import { browserPlaybackClock } from '$lib/playback/clock';
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import { seekBarHeight } from '$lib/playback/seek-bar';
	import { stoppedVeilColor } from '$lib/playback/veil';
	import { videoPlayback } from '$lib/playback/video-playback';
	import { generatePlayback } from './generate-video';
	import { VideoGeneration } from './VideoGeneration.svelte';
	import OutputLayout from './OutputLayout.svelte';
	import ResolutionSelect from './ResolutionSelect.svelte';
	import {
		parseResolution,
		defaultResolution,
		type Resolution,
		type VideoOutputType
	} from './output';
	import { supportedAudioCodecs, supportedVideoCodecs } from './video-container';
	import * as m from '$lib/paraglide/messages';

	let {
		outputType,
		outputTypeSelector
	}: {
		outputType: VideoOutputType;
		outputTypeSelector: Snippet;
	} = $props();

	let resolution = $state<Resolution>(defaultResolution);
	let bitmap = $derived(parseResolution(resolution));
	let videoAspectRatio = $derived(`${bitmap.width} / ${bitmap.height}`);
	let videoCodecChoice = $state<VideoCodec | null>(null);
	let audioCodecChoice = $state<AudioCodec | null>(null);
	const generation = new VideoGeneration(generatePlayback);
	const playbackSide = videoPlayback(browserPlaybackClock());
	const session = new PlaybackSession({
		maxFrame: BIP_BOP_MAX_FRAME,
		fps: BIP_BOP_FPS,
		connect: playbackSide.connect
	});

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
			: (generation.defaultAudioCodec ?? audioCodecs[0])
	);

	$effect(() => {
		void generation.loadDefaultAudioCodec(outputType);
	});

	function invalidate() {
		generation.cancel();
		session.reset();
	}

	$effect(() => {
		void outputType;
		invalidate();
	});

	function start() {
		session.reset();
		generation.start({
			outputType,
			videoCodec,
			audioCodec,
			resolution
		});
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => {
			session.dispose();
			generation.dispose();
		};
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
		return m.error_video_generation_failed();
	}
</script>

{#snippet placeholderViewport(overlay?: Snippet)}
	<div class="stage">
		<div
			class="viewport"
			style:aspect-ratio={videoAspectRatio}
			role="img"
			aria-label={m.video_placeholder_aria()}
		>
			{#if overlay}
				{@render overlay()}
			{:else}
				<BipBopStill width={bitmap.width} height={bitmap.height} />
			{/if}
		</div>
		<div class="seek-reserve" style:height={seekBarHeight} aria-hidden="true"></div>
	</div>
{/snippet}

{#snippet actions(pending: boolean)}
	<button type="button" class="generate" disabled={pending} onclick={start}>{m.generate()}</button>
{/snippet}

<OutputLayout>
	{#snippet media()}
		<div {@attach release}>
			{#if generation.playback}
				{#await generation.playback}
					{@render placeholderViewport(loadingOverlay)}
				{:then url}
					{#snippet content({ onclick })}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							class="media viewport"
							style:aspect-ratio={videoAspectRatio}
							src={url}
							playsinline
							aria-label={m.generated_video_aria()}
							{onclick}
							{@attach (element) => {
								const detach = playbackSide.attach(element);
								return () => {
									detach();
									URL.revokeObjectURL(url);
								};
							}}
						></video>
					{/snippet}
					<PlaybackControls
						playing={session.playing}
						frame={session.frame}
						maxFrame={session.maxFrame}
						fps={session.fps}
						onplaybackchange={(next) => session.setPlaying(next)}
						onframechange={(next) => session.seek(next)}
						{content}
					/>
				{:catch}
					{@render placeholderViewport()}
				{/await}
			{:else}
				{@render placeholderViewport()}
			{/if}
		</div>
	{/snippet}
	{#snippet settings()}
		<div class="settings-form" onchange={invalidate}>
			{@render outputTypeSelector()}
			<div class="output-fields">
				<ResolutionSelect bind:value={resolution} />
				<label>
					{m.video_codec()}
					<select value={videoCodec} onchange={onVideoCodecChange}>
						{#each videoCodecs as videoCodecOption (videoCodecOption)}
							<option value={videoCodecOption}>{videoCodecOption}</option>
						{/each}
					</select>
				</label>
				<label>
					{m.audio_codec()}
					<select value={audioCodec} onchange={onAudioCodecChange}>
						{#each audioCodecs as audioCodecOption (audioCodecOption)}
							<option value={audioCodecOption}>{audioCodecOption}</option>
						{/each}
					</select>
				</label>
			</div>
			<div class="settings-actions">
				{#if generation.playback}
					{#await generation.playback}
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
			</div>
		</div>
	{/snippet}
</OutputLayout>

{#snippet loadingOverlay()}
	<div class="loading">
		<div class="veil" style:background={stoppedVeilColor}></div>
		<progress aria-label={m.generating_aria()}></progress>
	</div>
{/snippet}

<style>
	.stage {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.viewport {
		display: grid;
		width: 100%;
		min-width: 0;
		background: #000;
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}

	.media {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		object-fit: contain;
	}

	.viewport :global(canvas) {
		grid-area: 1 / 1;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}

	.seek-reserve {
		flex-shrink: 0;
		width: 100%;
	}

	.loading {
		grid-area: 1 / 1;
		display: grid;
		box-sizing: border-box;
		min-width: 0;
		min-height: 0;
	}

	.veil {
		grid-area: 1 / 1;
	}

	.loading > progress {
		grid-area: 1 / 1;
		z-index: 1;
		place-self: center;
		width: 40%;
		margin: 0;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: var(--pico-spacing, 1rem);
		flex: 1;
		min-height: 100%;
	}

	.settings-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: auto;
	}

	.generate {
		width: 100%;
		margin: 0;
	}
</style>

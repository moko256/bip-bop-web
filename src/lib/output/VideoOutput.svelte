<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import type { AudioCodec, VideoCodec } from 'mediabunny';
	import BipBopStill from '$lib/bip-bop/BipBopStill.svelte';
	import type { Snippet } from 'svelte';
	import { browserPlaybackClock } from '$lib/playback/clock';
	import type { PlaybackContentProps } from '$lib/playback/playback-content';
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { PlaybackSession } from '$lib/playback/PlaybackSession.svelte';
	import { seekReserveHeight } from '$lib/playback/seek-bar';
	import { stoppedVeilColor } from '$lib/playback/veil';
	import { videoPlayback } from '$lib/playback/video-playback';
	import { generatePlayback } from './generate-video';
	import { VideoGeneration } from './VideoGeneration.svelte';
	import OutputLayout from './OutputLayout.svelte';
	import ResolutionSelect from './ResolutionSelect.svelte';
	import {
		DEFAULT_FPS,
		DEFAULT_FRAME_COUNT,
		displayedFrameCount,
		FPS_PRESETS,
		initialFrameTimeline,
		maxFrameCountForFps,
		withCurrentFps,
		withEnteredFrameCount
	} from './frame-timeline';
	import {
		parseResolution,
		defaultResolution,
		type Resolution,
		type VideoOutputType
	} from './output';
	import { videoDownloadName } from './video-download-name';
	import { defaultVideoQuality, videoQualityLevels, type VideoQualityLevel } from './video-quality';
	import { supportedAudioCodecs, supportedVideoCodecs, videoOutputFormat } from './video-container';
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
	let mimeType = $derived(videoOutputFormat(outputType).mimeType);
	let videoCodecChoice = $state<VideoCodec | null>(null);
	let audioCodecChoice = $state<AudioCodec | null>(null);
	let videoQuality = $state<VideoQualityLevel>(defaultVideoQuality);
	let timeline = $state(initialFrameTimeline());
	let fpsText = $state(String(initialFrameTimeline().currentFps));
	let frameCountText = $state(String(displayedFrameCount(initialFrameTimeline())));
	let downloadName = $state<string | null>(null);
	let frameCountMax = $derived(maxFrameCountForFps(timeline.currentFps));
	const generation = new VideoGeneration(generatePlayback);
	const playbackTimeline = {
		fps: DEFAULT_FPS,
		maxFrame: DEFAULT_FRAME_COUNT
	};
	const playbackSide = videoPlayback(browserPlaybackClock(), playbackTimeline);
	const session = new PlaybackSession({
		maxFrame: playbackTimeline.maxFrame,
		fps: playbackTimeline.fps,
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
		downloadName = null;
		generation.cancel();
		session.reset();
	}

	$effect(() => {
		void outputType;
		invalidate();
	});

	function onFpsInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		fpsText = input.value;
		if (!input.validity.valid) return;
		const next = withCurrentFps(timeline, input.valueAsNumber);
		if (next === timeline) return;
		timeline = next;
		frameCountText = String(displayedFrameCount(next));
		invalidate();
	}

	function onFrameCountInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		frameCountText = input.value;
		if (!input.validity.valid) return;
		const next = withEnteredFrameCount(timeline, input.valueAsNumber);
		if (next === timeline) return;
		timeline = next;
		invalidate();
	}

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget;
		if (!(form instanceof HTMLFormElement) || !form.checkValidity()) return;
		const frameCount = Number(frameCountText);
		const fps = Number(fpsText);
		downloadName = videoDownloadName({
			width: bitmap.width,
			height: bitmap.height,
			fps,
			frameCount,
			videoCodec,
			audioCodec,
			videoQuality,
			extension: outputType
		});
		playbackTimeline.fps = fps;
		playbackTimeline.maxFrame = frameCount;
		session.setTimeline(frameCount, fps);
		session.reset();
		generation.start({
			outputType,
			videoCodec,
			audioCodec,
			resolution,
			frameCount,
			fps,
			videoQuality
		});
	}

	function save(url: string) {
		if (!downloadName) return;
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = downloadName;
		document.body.append(anchor);
		anchor.click();
		anchor.remove();
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
				<BipBopStill
					width={bitmap.width}
					height={bitmap.height}
					video={{
						mimeType,
						videoCodec,
						audioCodec,
						videoQuality,
						fps: timeline.currentFps
					}}
				/>
			{/if}
		</div>
		<div class="seek-reserve" style:height={seekReserveHeight} aria-hidden="true"></div>
	</div>
{/snippet}

{#snippet actions(pending: boolean, downloadUrl: string | null)}
	<button type="submit" class="action" disabled={pending}>{m.generate()}</button>
	<button
		type="button"
		class="action outline"
		disabled={!pending}
		onclick={() => generation.cancel()}>{m.stop()}</button
	>
	<button
		type="button"
		class="action"
		disabled={downloadUrl === null}
		onclick={() => {
			if (downloadUrl) save(downloadUrl);
		}}>{m.download()}</button
	>
{/snippet}

<OutputLayout>
	{#snippet media()}
		<div {@attach release}>
			{#if generation.playback}
				{#await generation.playback}
					{@render placeholderViewport(loadingOverlay)}
				{:then url}
					{#snippet content({ onclick }: PlaybackContentProps)}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							class="media viewport"
							style:aspect-ratio={videoAspectRatio}
							src={url}
							playsinline
							aria-label={m.generated_video_aria()}
							{onclick}
							{@attach playbackSide.attach}
						></video>
					{/snippet}
					<PlaybackControls
						playing={session.playing}
						frame={session.frame}
						maxFrame={session.maxFrame ?? playbackTimeline.maxFrame}
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
		<form class="settings-form" onsubmit={onSubmit} onchange={invalidate}>
			{@render outputTypeSelector()}
			<div class="settings-actions">
				{#if generation.playback}
					{#await generation.playback}
						{@render actions(true, null)}
					{:then url}
						{@render actions(false, url)}
					{:catch error}
						{@render actions(false, null)}
						<p role="alert">{errorMessage(error)}</p>
					{/await}
				{:else}
					{@render actions(false, null)}
				{/if}
			</div>
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
				<label>
					{m.video_quality()}
					<select bind:value={videoQuality}>
						{#each videoQualityLevels as level (level)}
							<option value={level}>{level}</option>
						{/each}
					</select>
				</label>
				<label>
					{m.frame_count()}
					<input
						type="number"
						min="1"
						step="1"
						max={frameCountMax}
						required
						value={frameCountText}
						oninput={onFrameCountInput}
					/>
				</label>
				<label>
					{m.fps()}
					<input
						type="number"
						min="1"
						max="240"
						step="any"
						required
						list="fps-presets"
						value={fpsText}
						oninput={onFpsInput}
					/>
					<datalist id="fps-presets">
						{#each FPS_PRESETS as preset (preset)}
							<option value={preset}></option>
						{/each}
					</datalist>
				</label>
			</div>
		</form>
	{/snippet}
</OutputLayout>

{#snippet loadingOverlay()}
	<div class="loading">
		<div class="veil" style:background={stoppedVeilColor}></div>
		<progress
			aria-label={m.generating_aria()}
			max={generation.totalFrames}
			value={generation.completedFrames}
		></progress>
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
	}

	.viewport:has(> .loading) {
		outline: 1px solid var(--pico-muted-border-color, #ccc);
	}

	.media.viewport {
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
		image-rendering: pixelated;
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
		margin: 0;
	}

	.settings-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.action {
		width: 100%;
		margin: 0;
	}
</style>

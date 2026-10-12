<script lang="ts">
	import type { Attachment } from 'svelte/attachments';
	import BipBopStill from '$lib/bip-bop/BipBopStill.svelte';
	import type { Snippet } from 'svelte';
	import type { PlaybackContentProps } from '$lib/playback/playback-content';
	import PlaybackControls from '$lib/playback/PlaybackControls.svelte';
	import { seekReserveHeight } from '$lib/playback/seek-bar';
	import { stoppedVeilColor } from '$lib/playback/veil';
	import { FPS_PRESETS } from './frame-entry';
	import OutputLayout from './OutputLayout.svelte';
	import ResolutionSelect from './ResolutionSelect.svelte';
	import type { VideoOutputType } from './output';
	import { videoQualityLevels } from './video-quality';
	import { VideoOutputRun } from './VideoOutputRun.svelte';
	import * as m from '$lib/paraglide/messages';

	let {
		outputType,
		outputTypeSelector
	}: {
		outputType: VideoOutputType;
		outputTypeSelector: Snippet;
	} = $props();

	const run = new VideoOutputRun({
		outputType: () => outputType
	});

	function onFpsInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		run.setFpsText(input.value, input.validity.valid ? input.valueAsNumber : null);
	}

	function onFrameCountInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		run.setFrameCountText(input.value, input.validity.valid ? input.valueAsNumber : null);
	}

	function onVideoCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		run.chooseVideoCodec(value);
	}

	function onAudioCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		run.chooseAudioCodec(value);
	}

	function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget;
		if (!(form instanceof HTMLFormElement) || !form.checkValidity()) return;
		run.submit();
	}

	function errorMessage(error: unknown): string {
		if (error instanceof Error && error.message !== '') return error.message;
		return m.error_video_generation_failed();
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => run.dispose();
	};
</script>

{#snippet placeholderViewport(overlay?: Snippet)}
	<div class="stage">
		<div
			class="viewport"
			style:aspect-ratio={run.aspectRatio}
			role="img"
			aria-label={m.video_placeholder_aria()}
		>
			{#if overlay}
				{@render overlay()}
			{:else}
				<BipBopStill
					width={run.bitmap.width}
					height={run.bitmap.height}
					video={{
						mimeType: run.mimeType,
						videoCodec: run.videoCodec,
						audioCodec: run.audioCodec,
						videoQuality: run.videoQuality,
						fps: run.frameEntry.currentFps
					}}
				/>
			{/if}
		</div>
		<div class="seek-reserve" style:height={seekReserveHeight} aria-hidden="true"></div>
	</div>
{/snippet}

{#snippet actions(pending: boolean, downloadUrl: string | null)}
	<button
		type="submit"
		class="action"
		disabled={pending || !run.encodeCheck.encodable}
		aria-busy={run.encodeCheck.checking ? 'true' : undefined}>{m.generate()}</button
	>
	{#if !run.encodeCheck.checking && !run.encodeCheck.encodable}
		<p class="encode-error" role="alert">{m.error_encode_unsupported()}</p>
	{/if}
	<button type="button" class="action outline" disabled={!pending} onclick={() => run.stop()}
		>{m.stop()}</button
	>
	<button
		type="button"
		class="action"
		disabled={downloadUrl === null}
		onclick={() => {
			if (downloadUrl) run.save(downloadUrl);
		}}>{m.download()}</button
	>
{/snippet}

<OutputLayout>
	{#snippet media()}
		<div {@attach release}>
			{#if run.generation.videoUrl}
				{#await run.generation.videoUrl}
					{@render placeholderViewport(loadingOverlay)}
				{:then url}
					{#snippet content({ onclick }: PlaybackContentProps)}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video
							class="media viewport"
							style:aspect-ratio={run.aspectRatio}
							src={url}
							playsinline
							aria-label={m.generated_video_aria()}
							{onclick}
							{@attach run.attachVideo}
						></video>
					{/snippet}
					<PlaybackControls
						playing={run.session.playing}
						frame={run.session.frame}
						maxFrame={run.maxFrame}
						fps={run.session.fps}
						onplaybackchange={(next) => run.session.setPlaying(next)}
						onframechange={(next) => run.session.seek(next)}
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
		<form class="settings-form" onsubmit={onSubmit} onchange={() => run.invalidate()}>
			{@render outputTypeSelector()}
			<div class="settings-actions">
				{#if run.generation.videoUrl}
					{#await run.generation.videoUrl}
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
				<ResolutionSelect bind:value={run.resolution} />
				<label>
					{m.video_codec()}
					<select value={run.videoCodec} onchange={onVideoCodecChange}>
						{#each run.videoCodecs as videoCodecOption (videoCodecOption)}
							<option value={videoCodecOption}>{videoCodecOption}</option>
						{/each}
					</select>
				</label>
				<label>
					{m.audio_codec()}
					<select value={run.audioCodec} onchange={onAudioCodecChange}>
						{#each run.audioCodecs as audioCodecOption (audioCodecOption)}
							<option value={audioCodecOption}>{audioCodecOption}</option>
						{/each}
					</select>
				</label>
				<label>
					{m.video_quality()}
					<select bind:value={run.videoQuality}>
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
						max={run.frameCountMax}
						required
						value={run.frameCountText}
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
						value={run.fpsText}
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
			max={run.generation.totalFrames}
			value={run.generation.completedFrames}
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

	.encode-error {
		width: 100%;
		margin: 0;
	}
</style>

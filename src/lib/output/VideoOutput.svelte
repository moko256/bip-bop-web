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
	import VideoPlayback from './VideoPlayback.svelte';

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
		const promise = generatePlayback({
			outputType,
			codec,
			resolution,
			signal: abort.signal
		});
		promise.catch(() => {
			// {#await} renders the rejection. This marks a discarded run as handled.
		});
		playback = promise;
	}

	const release: Attachment<HTMLDivElement> = () => {
		return () => abort.abort();
	};

	function onCodecChange(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const match = codecs.find((item) => item === value);
		if (match) codecChoice = match;
	}
</script>

{#snippet controls()}
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
{/snippet}

<div {@attach release}>
	<VideoPlayback {playback} {controls} ongenerate={start} />
</div>

import { AudioBufferSink, BlobSource, Input, MP4 } from 'mediabunny';
import { describe, expect, it } from 'vitest';
import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import { generateBipBopVideo } from './generate-video';
import { supportedAudioCodecs } from './output';
import { getFirstEncodableAudioCodec, Quality } from 'mediabunny';

async function defaultMp4AudioCodec() {
	const codec = await getFirstEncodableAudioCodec(supportedAudioCodecs('mp4'), {
		numberOfChannels: 1,
		sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
		quality: new Quality('high')
	});
	if (!codec) throw new Error('音声コーデックを利用できません');
	return codec;
}

function correlation(samples: Float32Array, frequencyHz: number, sampleRate: number): number {
	const frameCount = Math.min(samples.length, Math.round(sampleRate * 0.016));
	let sum = 0;
	for (let index = 0; index < frameCount; index += 1) {
		const sample = samples[index] ?? 0;
		sum += sample * Math.sin((2 * Math.PI * frequencyHz * index) / sampleRate);
	}
	return Math.abs(sum) / frameCount;
}

describe('generateBipBopVideo', () => {
	it('writes an mp4 blob with the format mime type', async () => {
		const blob = await generateBipBopVideo({
			outputType: 'mp4',
			codec: 'avc',
			audioCodec: await defaultMp4AudioCodec(),
			width: 64,
			height: 64,
			frameCount: 2
		});

		expect(blob.type).toBe('video/mp4');
		expect(blob.size).toBeGreaterThan(0);
	});

	it('writes a webm blob with the format mime type', async () => {
		const blob = await generateBipBopVideo({
			outputType: 'webm',
			codec: 'vp9',
			audioCodec: 'opus',
			width: 64,
			height: 64,
			frameCount: 2
		});

		expect(blob.type).toBe('video/webm');
		expect(blob.size).toBeGreaterThan(0);
	});

	it('writes a 1500Hz burst on even seconds and a 475Hz burst on odd seconds', async () => {
		const blob = await generateBipBopVideo({
			outputType: 'mp4',
			codec: 'avc',
			audioCodec: await defaultMp4AudioCodec(),
			width: 64,
			height: 64,
			frameCount: 61
		});
		const input = new Input({ source: new BlobSource(blob), formats: [MP4] });
		try {
			const track = await input.getPrimaryAudioTrack();
			expect(track).not.toBeNull();
			const sink = new AudioBufferSink(track!);
			const opening = await sink.getBuffer(0);
			const second = await sink.getBuffer(1);
			expect(opening).not.toBeNull();
			expect(second).not.toBeNull();
			const openingSamples = opening!.buffer.getChannelData(0);
			const secondSamples = second!.buffer.getChannelData(0);
			expect(correlation(openingSamples, 1500, opening!.buffer.sampleRate)).toBeGreaterThan(0.2);
			expect(correlation(openingSamples, 475, opening!.buffer.sampleRate)).toBeLessThan(0.05);
			expect(correlation(secondSamples, 475, second!.buffer.sampleRate)).toBeGreaterThan(0.2);
			expect(correlation(secondSamples, 1500, second!.buffer.sampleRate)).toBeLessThan(0.05);
		} finally {
			input.dispose();
		}
	});

	it('stops when the caller aborts', async () => {
		const abort = new AbortController();
		abort.abort();

		await expect(
			generateBipBopVideo({
				outputType: 'mp4',
				codec: 'avc',
				audioCodec: await defaultMp4AudioCodec(),
				width: 64,
				height: 64,
				frameCount: 30,
				signal: abort.signal
			})
		).rejects.toSatisfy(
			(error: unknown) => error instanceof DOMException && error.name === 'AbortError'
		);
	});
});

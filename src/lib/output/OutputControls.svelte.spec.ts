import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { getFirstEncodableAudioCodec, Quality } from 'mediabunny';
import { BIP_BOP_AUDIO_SAMPLE_RATE } from '$lib/bip-bop/audio';
import OutputControls from './OutputControls.svelte';
import { supportedAudioCodecs, supportedVideoCodecs } from './output';

const { generatePlayback } = vi.hoisted(() => ({
	generatePlayback: vi.fn()
}));

vi.mock('./generate-video', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./generate-video')>();
	return { ...actual, generatePlayback };
});

function videoUrl(): string {
	return URL.createObjectURL(new Blob([Uint8Array.from([1, 2, 3])], { type: 'video/mp4' }));
}

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: unknown) => void = () => {};
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function assertPrecedes(
	earlier: ReturnType<typeof page.getByRole>,
	later: ReturnType<typeof page.getByRole>
) {
	const before = earlier.element();
	const after = later.element();
	expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

describe('OutputControls', () => {
	let defaultMp4AudioCodec: string;

	beforeEach(async () => {
		generatePlayback.mockReset();
		const audioCodec = await getFirstEncodableAudioCodec(supportedAudioCodecs('mp4'), {
			numberOfChannels: 1,
			sampleRate: BIP_BOP_AUDIO_SAMPLE_RATE,
			quality: new Quality('high')
		});
		if (!audioCodec) throw new Error('音声コーデックを利用できません');
		defaultMp4AudioCodec = audioCodec;
	});

	it('starts on page with the live canvas above OutputType', async () => {
		render(OutputControls);

		await expect.element(page.getByRole('radio', { name: 'ページ' })).toBeChecked();
		await expect.element(page.getByLabelText('Bip-Bop preview')).toBeVisible();
		await expect.element(page.getByRole('button', { name: '生成' })).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'ダウンロード' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).not.toBeInTheDocument();
		assertPrecedes(
			page.getByLabelText('Bip-Bop preview'),
			page.getByRole('group', { name: 'OutputType' })
		);
	});

	it('shows a 16:9 placeholder and the container codecs for mp4 and webm', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();

		await expect.element(page.getByRole('radio', { name: 'mp4' })).toBeChecked();
		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
		await expect.element(page.getByLabelText('Bip-Bop preview')).not.toBeInTheDocument();
		await expect.element(page.getByRole('combobox', { name: '解像度' })).toHaveValue('1920x1080');
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue('avc');
		for (const videoCodec of supportedVideoCodecs('mp4')) {
			await expect
				.element(page.getByRole('option', { name: videoCodec, exact: true }))
				.toBeInTheDocument();
		}
		await expect
			.element(page.getByRole('combobox', { name: 'オーディオコーデック' }))
			.toHaveValue(defaultMp4AudioCodec);
		for (const audioCodec of supportedAudioCodecs('mp4')) {
			await expect
				.element(page.getByRole('option', { name: audioCodec, exact: true }))
				.toBeInTheDocument();
		}
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
		await expect.element(page.getByRole('option', { name: '720×480' })).toBeInTheDocument();
		assertPrecedes(
			page.getByRole('img', { name: '動画のプレースホルダー' }),
			page.getByRole('group', { name: 'OutputType' })
		);
		assertPrecedes(
			page.getByRole('group', { name: 'OutputType' }),
			page.getByRole('combobox', { name: '解像度' })
		);
		assertPrecedes(
			page.getByRole('combobox', { name: '解像度' }),
			page.getByRole('button', { name: '生成' })
		);

		await page.getByRole('radio', { name: 'webm' }).click();

		await expect.element(page.getByRole('radio', { name: 'webm' })).toBeChecked();
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue(supportedVideoCodecs('webm')[0]);
		await expect.element(page.getByRole('button', { name: '生成' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).not.toBeInTheDocument();
	});

	it('keeps a video codec that both containers support', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('combobox', { name: 'ビデオコーデック' }).selectOptions('vp9');
		await page.getByRole('radio', { name: 'webm' }).click();

		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue('vp9');
	});

	it('keeps an audio codec that both containers support', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('combobox', { name: 'オーディオコーデック' }).selectOptions('opus');
		await page.getByRole('radio', { name: 'webm' }).click();

		await expect
			.element(page.getByRole('combobox', { name: 'オーディオコーデック' }))
			.toHaveValue('opus');
	});

	it('places the generated video where the placeholder was', async () => {
		const pending = deferred<string>();
		generatePlayback.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();

		await expect.element(page.getByRole('button', { name: '生成' })).toBeDisabled();
		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByRole('progressbar', { name: '生成中' })).toBeVisible();
		const placeholder = page.getByRole('img', { name: '動画のプレースホルダー' }).element();
		const progress = page
			.getByRole('progressbar', { name: '生成中' })
			.element() as HTMLProgressElement;
		expect(placeholder.getAttribute('aria-busy')).toBeNull();
		expect(placeholder.clientWidth).toBeGreaterThan(0);
		expect(progress.hasAttribute('value')).toBe(false);
		const place = placeholder.getBoundingClientRect();
		const bar = progress.getBoundingClientRect();
		expect(bar.width).toBeGreaterThan(0);
		expect(bar.width).toBeLessThan(place.width);
		expect(Math.abs(bar.left + bar.width / 2 - (place.left + place.width / 2))).toBeLessThan(1);
		expect(Math.abs(bar.top + bar.height / 2 - (place.top + place.height / 2))).toBeLessThan(1);
		expect(generatePlayback).toHaveBeenCalledWith({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: defaultMp4AudioCodec,
			resolution: '1920x1080',
			signal: expect.any(AbortSignal)
		});

		pending.resolve(videoUrl());

		await expect.element(page.getByLabelText('生成した動画')).toBeVisible();
		await expect
			.element(page.getByRole('img', { name: '動画のプレースホルダー' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('progressbar', { name: '生成中' })).not.toBeInTheDocument();
		await expect.element(page.getByRole('progressbar', { name: '再生位置' })).toBeVisible();
		await expect.element(page.getByText('00:00 / 00:10')).toBeVisible();
		const video = page.getByLabelText('生成した動画').element() as HTMLVideoElement;
		expect(video.hasAttribute('controls')).toBe(false);
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
	});

	it('plays, seeks, and pauses the generated video from the transport', async () => {
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
		try {
			generatePlayback.mockResolvedValue(videoUrl());
			render(OutputControls);

			await page.getByRole('radio', { name: 'mp4' }).click();
			await page.getByRole('button', { name: '生成' }).click();
			await expect.element(page.getByLabelText('生成した動画')).toBeVisible();

			await page.getByRole('button', { name: '再生' }).first().click();
			expect(play).toHaveBeenCalled();
			await expect.element(page.getByRole('button', { name: '停止' }).first()).toBeVisible();

			const video = page.getByLabelText('生成した動画').element() as HTMLVideoElement;
			await page.getByRole('spinbutton', { name: 'フレーム' }).fill('90');
			expect(video.currentTime).toBeCloseTo(90 / 60);

			await page.getByRole('button', { name: '停止' }).first().click();
			expect(pause).toHaveBeenCalled();
		} finally {
			play.mockRestore();
			pause.mockRestore();
		}
	});

	it('returns to the placeholder when the resolution changes', async () => {
		generatePlayback.mockResolvedValue(videoUrl());
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();
		await expect.element(page.getByLabelText('生成した動画')).toBeVisible();

		await page.getByRole('combobox', { name: '解像度' }).selectOptions('720x480');

		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByLabelText('生成した動画')).not.toBeInTheDocument();

		await page.getByRole('button', { name: '生成' }).click();
		expect(generatePlayback).toHaveBeenLastCalledWith({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: defaultMp4AudioCodec,
			resolution: '720x480',
			signal: expect.any(AbortSignal)
		});
	});

	it('drops an in-flight video when OutputType changes', async () => {
		const pending = deferred<string>();
		generatePlayback.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();
		await page.getByRole('radio', { name: 'webm' }).click();
		pending.resolve(videoUrl());

		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByLabelText('生成した動画')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
	});

	it('shows the encoder error and keeps the placeholder', async () => {
		generatePlayback.mockRejectedValue(new Error('このコーデックはエンコードできません'));
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('このコーデックはエンコードできません');
		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
	});

	it('shows the live canvas and fullscreen url controls', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'フルスクリーンURL' }).click();

		await expect.element(page.getByRole('radio', { name: 'フルスクリーンURL' })).toBeChecked();
		await expect.element(page.getByLabelText('Bip-Bop preview')).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: '解像度' })).toBeInTheDocument();
		await expect.element(page.getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '生成' })).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.not.toBeInTheDocument();
		assertPrecedes(
			page.getByLabelText('Bip-Bop preview'),
			page.getByRole('group', { name: 'OutputType' })
		);
	});
});

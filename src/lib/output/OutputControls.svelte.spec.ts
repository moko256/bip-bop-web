import * as m from '$lib/paraglide/messages';
import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OutputControls from './OutputControls.svelte';
import { preferredAudioCodec } from './generate-video';
import { supportedAudioCodecs, supportedVideoCodecs } from './video-container';

const { generatePlayback, loadVideoOutput, loadVideoOutputActual } = vi.hoisted(() => ({
	generatePlayback: vi.fn(),
	loadVideoOutput: vi.fn(),
	loadVideoOutputActual: {
		current: undefined as
			| undefined
			| (() => ReturnType<typeof import('./load-video-output').loadVideoOutput>)
	}
}));

vi.mock('./generate-video', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./generate-video')>();
	return { ...actual, generatePlayback };
});

vi.mock('./load-video-output', async (importOriginal) => {
	const actual = await importOriginal<typeof import('./load-video-output')>();
	loadVideoOutputActual.current = actual.loadVideoOutput;
	loadVideoOutput.mockImplementation(actual.loadVideoOutput);
	return { loadVideoOutput };
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
		loadVideoOutput.mockReset();
		const loadEncoder = loadVideoOutputActual.current;
		if (!loadEncoder) throw new Error('Expected video output loader');
		loadVideoOutput.mockImplementation(loadEncoder);
		const audioCodec = await preferredAudioCodec('mp4');
		if (!audioCodec) throw new Error(m.error_audio_codec_unavailable());
		defaultMp4AudioCodec = audioCodec;
	});

	it('starts on page with the live canvas above OutputType', async () => {
		render(OutputControls);

		await expect
			.element(page.getByRole('button', { name: m.output_type_page() }))
			.toHaveAttribute('aria-current', 'true');
		await expect.element(page.getByLabelText(m.bip_bop_preview_aria())).toBeVisible();
		await expect.element(page.getByRole('button', { name: m.generate() })).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'ダウンロード' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.open() })).not.toBeInTheDocument();
		assertPrecedes(
			page.getByLabelText(m.bip_bop_preview_aria()),
			page.getByRole('group', { name: m.output_type_group_aria_label() })
		);
	});

	it('shows a 16:9 placeholder and the container codecs for mp4 and webm', async () => {
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();

		await expect
			.element(page.getByRole('button', { name: 'mp4' }))
			.toHaveAttribute('aria-current', 'true');
		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
		await expect.element(page.getByLabelText(m.bip_bop_preview_aria())).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('combobox', { name: m.resolution() }))
			.toHaveValue('1920x1080');
		await expect.element(page.getByRole('combobox', { name: m.video_codec() })).toHaveValue('avc');
		for (const videoCodec of supportedVideoCodecs('mp4')) {
			await expect
				.element(page.getByRole('option', { name: videoCodec, exact: true }))
				.toBeInTheDocument();
		}
		await expect
			.element(page.getByRole('combobox', { name: m.audio_codec() }))
			.toHaveValue(defaultMp4AudioCodec);
		for (const audioCodec of supportedAudioCodecs('mp4')) {
			await expect
				.element(page.getByRole('option', { name: audioCodec, exact: true }))
				.toBeInTheDocument();
		}
		await expect.element(page.getByRole('button', { name: m.generate() })).toBeEnabled();
		await expect.element(page.getByRole('option', { name: '640×480' })).toBeInTheDocument();
		const placeholder = page.getByRole('img', { name: m.video_placeholder_aria() }).element();
		const canvas = placeholder.querySelector('canvas') as HTMLCanvasElement;
		expect(canvas.width).toBe(1920);
		expect(canvas.height).toBe(1080);
		expect(canvas.clientWidth === canvas.width && canvas.clientHeight === canvas.height).toBe(
			false
		);
		expect(getComputedStyle(canvas).objectFit).toBe('contain');
		expect(Math.abs(placeholder.clientWidth / placeholder.clientHeight - 16 / 9)).toBeLessThan(
			0.02
		);
		expect(Math.abs(placeholder.clientHeight - canvas.clientHeight)).toBeLessThan(1);
		expect(canvas.clientWidth).toBe(placeholder.clientWidth);
		assertPrecedes(
			page.getByRole('img', { name: m.video_placeholder_aria() }),
			page.getByRole('group', { name: m.output_type_group_aria_label() })
		);
		assertPrecedes(
			page.getByRole('group', { name: m.output_type_group_aria_label() }),
			page.getByRole('combobox', { name: m.resolution() })
		);
		assertPrecedes(
			page.getByRole('combobox', { name: m.resolution() }),
			page.getByRole('button', { name: m.generate() })
		);

		await page.getByRole('button', { name: 'webm' }).click();

		await expect
			.element(page.getByRole('button', { name: 'webm' }))
			.toHaveAttribute('aria-current', 'true');
		await expect
			.element(page.getByRole('combobox', { name: m.video_codec() }))
			.toHaveValue(supportedVideoCodecs('webm')[0]);
		await expect.element(page.getByRole('button', { name: m.generate() })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.open() })).not.toBeInTheDocument();
	});

	it('centers progress in the video area while the encoder loads', async () => {
		const pending = deferred<Awaited<ReturnType<typeof loadVideoOutput>>>();
		loadVideoOutput.mockReturnValueOnce(pending.promise);
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();

		const progress = page.getByRole('progressbar', { name: m.loading_video_output_aria() });
		await expect.element(progress).toBeVisible();
		const bar = progress.element() as HTMLProgressElement;
		const parent = bar.parentElement;
		if (!(parent instanceof HTMLElement)) throw new Error('Expected progress parent');
		expect(bar.hasAttribute('value')).toBe(false);
		const parentBox = parent.getBoundingClientRect();
		const barBox = bar.getBoundingClientRect();
		expect(parentBox.width).toBeGreaterThan(0);
		expect(parentBox.height).toBeGreaterThan(barBox.height);
		expect(Math.abs(parentBox.width / parentBox.height - 16 / 9)).toBeLessThan(0.02);
		expect(Math.abs(barBox.width / parentBox.width - 0.4)).toBeLessThan(0.02);
		expect(
			Math.abs(barBox.left + barBox.width / 2 - (parentBox.left + parentBox.width / 2))
		).toBeLessThan(1);
		expect(
			Math.abs(barBox.top + barBox.height / 2 - (parentBox.top + parentBox.height / 2))
		).toBeLessThan(1);
		await expect
			.element(page.getByRole('button', { name: 'mp4' }))
			.toHaveAttribute('aria-current', 'true');
		await expect
			.element(page.getByRole('img', { name: m.video_placeholder_aria() }))
			.not.toBeInTheDocument();

		const loadEncoder = loadVideoOutputActual.current;
		if (!loadEncoder) throw new Error('Expected video output loader');
		pending.resolve(await loadEncoder());

		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect
			.element(page.getByRole('progressbar', { name: m.loading_video_output_aria() }))
			.not.toBeInTheDocument();
	});

	it('keeps a video codec that both containers support', async () => {
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('combobox', { name: m.video_codec() }).selectOptions('vp9');
		await page.getByRole('button', { name: 'webm' }).click();

		await expect.element(page.getByRole('combobox', { name: m.video_codec() })).toHaveValue('vp9');
	});

	it('keeps an audio codec that both containers support', async () => {
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('combobox', { name: m.audio_codec() }).selectOptions('opus');
		await page.getByRole('button', { name: 'webm' }).click();

		await expect.element(page.getByRole('combobox', { name: m.audio_codec() })).toHaveValue('opus');
	});

	it('places the generated video where the placeholder was', async () => {
		const pending = deferred<string>();
		generatePlayback.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('button', { name: m.generate() }).click();

		await expect.element(page.getByRole('button', { name: m.generate() })).toBeDisabled();
		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect
			.element(page.getByRole('progressbar', { name: m.generating_aria() }))
			.toBeVisible();
		const placeholder = page.getByRole('img', { name: m.video_placeholder_aria() }).element();
		const progress = page
			.getByRole('progressbar', { name: m.generating_aria() })
			.element() as HTMLProgressElement;
		expect(placeholder.getAttribute('aria-busy')).toBeNull();
		expect(placeholder.clientWidth).toBeGreaterThan(0);
		expect(progress.hasAttribute('value')).toBe(false);
		const seekReserve = placeholder.nextElementSibling;
		if (!(seekReserve instanceof HTMLElement)) throw new Error('Expected seek reserve element');
		const seekBarPadding = seekReserve.clientHeight;
		expect(placeholder.querySelector('canvas')).toBeNull();
		const cover = progress.parentElement?.querySelector('.veil');
		if (!(cover instanceof HTMLElement)) throw new Error('Expected veil element');
		expect(getComputedStyle(cover).backgroundColor).toBe('rgba(0, 0, 0, 0.3)');
		const veilBox = cover.getBoundingClientRect();
		const place = placeholder.getBoundingClientRect();
		expect(Math.abs(veilBox.top - place.top)).toBeLessThan(1);
		expect(Math.abs(veilBox.left - place.left)).toBeLessThan(1);
		expect(Math.abs(veilBox.width - place.width)).toBeLessThan(1);
		expect(Math.abs(veilBox.height - place.height)).toBeLessThan(1);
		expect(Math.abs(veilBox.bottom - place.bottom)).toBeLessThan(1);
		const bar = progress.getBoundingClientRect();
		expect(bar.width).toBeGreaterThan(0);
		expect(bar.width).toBeLessThan(veilBox.width);
		expect(Math.abs(bar.left + bar.width / 2 - (veilBox.left + veilBox.width / 2))).toBeLessThan(1);
		expect(Math.abs(bar.top + bar.height / 2 - (veilBox.top + veilBox.height / 2))).toBeLessThan(1);
		expect(document.elementFromPoint(veilBox.left + 4, veilBox.top + 4)).toBe(cover);
		expect(document.elementFromPoint(bar.left + bar.width / 2, bar.top + bar.height / 2)).toBe(
			progress
		);
		expect(generatePlayback).toHaveBeenCalledWith({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: defaultMp4AudioCodec,
			resolution: '1920x1080',
			signal: expect.any(AbortSignal)
		});

		pending.resolve(videoUrl());

		await expect.element(page.getByLabelText(m.generated_video_aria())).toBeVisible();
		await expect
			.element(page.getByRole('img', { name: m.video_placeholder_aria() }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('progressbar', { name: m.generating_aria() }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('slider', { name: m.playback_position_aria() }))
			.toBeVisible();
		await expect.element(page.getByText('00:00 / 00:10')).toBeVisible();
		const seekBar = page.getByRole('slider', { name: m.playback_position_aria() }).element();
		expect(seekBar.getBoundingClientRect().height).toBeCloseTo(seekBarPadding, 0);
		const video = page.getByLabelText(m.generated_video_aria()).element() as HTMLVideoElement;
		expect(video.hasAttribute('controls')).toBe(false);
		await expect.element(page.getByRole('button', { name: m.generate() })).toBeEnabled();
	});

	it('toggles playback from the video surface and leaves context menu events alone', async () => {
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
		try {
			generatePlayback.mockResolvedValue(videoUrl());
			render(OutputControls);

			await page.getByRole('button', { name: 'mp4' }).click();
			await page.getByRole('button', { name: m.generate() }).click();
			await expect.element(page.getByLabelText(m.generated_video_aria())).toBeVisible();

			const video = page.getByLabelText(m.generated_video_aria()).element() as HTMLVideoElement;
			const menu = new Event('contextmenu', { bubbles: true, cancelable: true });
			video.dispatchEvent(menu);
			expect(menu.defaultPrevented).toBe(false);

			await page.getByLabelText(m.generated_video_aria()).click();
			expect(play).toHaveBeenCalled();

			await page.getByLabelText(m.generated_video_aria()).click();
			expect(pause).toHaveBeenCalled();
		} finally {
			play.mockRestore();
			pause.mockRestore();
		}
	});

	it('plays, seeks, and pauses the generated video from the transport', async () => {
		const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
		const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
		try {
			generatePlayback.mockResolvedValue(videoUrl());
			render(OutputControls);

			await page.getByRole('button', { name: 'mp4' }).click();
			await page.getByRole('button', { name: m.generate() }).click();
			await expect.element(page.getByLabelText(m.generated_video_aria())).toBeVisible();

			await page.getByRole('button', { name: m.playback_play() }).first().click();
			expect(play).toHaveBeenCalled();
			await expect
				.element(page.getByRole('button', { name: m.playback_pause() }).first())
				.toBeVisible();
			const playingField = page
				.getByRole('spinbutton', { name: m.frame_aria() })
				.element() as HTMLInputElement;
			expect(playingField.disabled).toBe(true);
			expect(playingField.value).toBe('');

			await page.getByRole('button', { name: m.playback_pause() }).first().click();
			expect(pause).toHaveBeenCalled();

			const video = page.getByLabelText(m.generated_video_aria()).element() as HTMLVideoElement;
			await page.getByRole('spinbutton', { name: m.frame_aria() }).fill('90');
			expect(video.currentTime).toBeCloseTo(90 / 60);
		} finally {
			play.mockRestore();
			pause.mockRestore();
		}
	});

	it('returns to the placeholder when the resolution changes', async () => {
		generatePlayback.mockResolvedValue(videoUrl());
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('button', { name: m.generate() }).click();
		await expect.element(page.getByLabelText(m.generated_video_aria())).toBeVisible();

		await page.getByRole('combobox', { name: m.resolution() }).selectOptions('640x480');

		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect.element(page.getByLabelText(m.generated_video_aria())).not.toBeInTheDocument();
		const host = page.getByRole('img', { name: m.video_placeholder_aria() }).element();
		const canvas = host.querySelector('canvas') as HTMLCanvasElement;
		expect(canvas.width).toBe(640);
		expect(canvas.height).toBe(480);
		expect(Math.abs(host.clientWidth / host.clientHeight - 640 / 480)).toBeLessThan(0.02);
		expect(canvas.clientWidth).toBe(host.clientWidth);
		expect(Math.abs(host.clientHeight - canvas.clientHeight)).toBeLessThan(1);

		await page.getByRole('button', { name: m.generate() }).click();
		expect(generatePlayback).toHaveBeenLastCalledWith({
			outputType: 'mp4',
			videoCodec: 'avc',
			audioCodec: defaultMp4AudioCodec,
			resolution: '640x480',
			signal: expect.any(AbortSignal)
		});
	});

	it('drops an in-flight video when OutputType changes', async () => {
		const pending = deferred<string>();
		generatePlayback.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('button', { name: m.generate() }).click();
		await page.getByRole('button', { name: 'webm' }).click();
		pending.resolve(videoUrl());

		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect.element(page.getByLabelText(m.generated_video_aria())).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.generate() })).toBeEnabled();
	});

	it('shows the encoder error and keeps the placeholder', async () => {
		const encodeError = 'This codec cannot be encoded';
		generatePlayback.mockRejectedValue(new Error(encodeError));
		render(OutputControls);

		await page.getByRole('button', { name: 'mp4' }).click();
		await page.getByRole('button', { name: m.generate() }).click();

		await expect.element(page.getByRole('alert')).toHaveTextContent(encodeError);
		await expect.element(page.getByRole('img', { name: m.video_placeholder_aria() })).toBeVisible();
		await expect.element(page.getByRole('progressbar')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.generate() })).toBeEnabled();
	});

	it('shows the live canvas and fullscreen url controls', async () => {
		render(OutputControls);

		await page.getByRole('button', { name: m.output_type_fullscreen_url() }).click();

		await expect
			.element(page.getByRole('button', { name: m.output_type_fullscreen_url() }))
			.toHaveAttribute('aria-current', 'true');
		await expect.element(page.getByLabelText(m.bip_bop_preview_aria())).toBeVisible();
		await expect.element(page.getByRole('combobox', { name: m.resolution() })).toBeInTheDocument();
		await expect.element(page.getByRole('textbox', { name: m.url_label() })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.copy() })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.open() })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: m.generate() })).not.toBeInTheDocument();
		await expect
			.element(page.getByRole('combobox', { name: m.video_codec() }))
			.not.toBeInTheDocument();
		assertPrecedes(
			page.getByLabelText(m.bip_bop_preview_aria()),
			page.getByRole('group', { name: m.output_type_group_aria_label() })
		);
	});
});

import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OutputControls from './OutputControls.svelte';
import { supportedVideoCodecs } from './output';

const { generateBipBopVideo } = vi.hoisted(() => ({
	generateBipBopVideo: vi.fn()
}));

vi.mock('./generate-video', () => ({
	generateBipBopVideo
}));

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
	beforeEach(() => {
		generateBipBopVideo.mockReset();
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
		await expect.element(page.getByLabelText('Bip-Bop preview')).not.toBeInTheDocument();
		await expect.element(page.getByRole('combobox', { name: '解像度' })).toHaveValue('1920x1080');
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue('avc');
		for (const codec of supportedVideoCodecs('mp4')) {
			await expect
				.element(page.getByRole('option', { name: codec, exact: true }))
				.toBeInTheDocument();
		}
		await expect
			.element(page.getByRole('combobox', { name: 'オーディオコーデック' }))
			.not.toBeInTheDocument();
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

	it('keeps a codec that both containers support', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('combobox', { name: 'ビデオコーデック' }).selectOptions('vp9');
		await page.getByRole('radio', { name: 'webm' }).click();

		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue('vp9');
	});

	it('places the generated video where the placeholder was', async () => {
		const pending = deferred<Blob>();
		generateBipBopVideo.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();

		await expect.element(page.getByRole('button', { name: '生成' })).toBeDisabled();
		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		expect(generateBipBopVideo).toHaveBeenCalledWith({
			outputType: 'mp4',
			codec: 'avc',
			width: 1920,
			height: 1080,
			signal: expect.any(AbortSignal)
		});

		pending.resolve(new Blob([Uint8Array.from([1, 2, 3])], { type: 'video/mp4' }));

		await expect.element(page.getByLabelText('生成した動画')).toBeVisible();
		await expect
			.element(page.getByRole('img', { name: '動画のプレースホルダー' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
	});

	it('returns to the placeholder when the resolution changes', async () => {
		generateBipBopVideo.mockResolvedValue(new Blob([Uint8Array.from([1])], { type: 'video/mp4' }));
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();
		await expect.element(page.getByLabelText('生成した動画')).toBeVisible();

		await page.getByRole('combobox', { name: '解像度' }).selectOptions('720x480');

		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByLabelText('生成した動画')).not.toBeInTheDocument();

		await page.getByRole('button', { name: '生成' }).click();
		expect(generateBipBopVideo).toHaveBeenLastCalledWith({
			outputType: 'mp4',
			codec: 'avc',
			width: 720,
			height: 480,
			signal: expect.any(AbortSignal)
		});
	});

	it('drops an in-flight video when OutputType changes', async () => {
		const pending = deferred<Blob>();
		generateBipBopVideo.mockReturnValue(pending.promise);
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();
		await page.getByRole('radio', { name: 'webm' }).click();
		pending.resolve(new Blob([Uint8Array.from([1])], { type: 'video/mp4' }));

		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
		await expect.element(page.getByLabelText('生成した動画')).not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '生成' })).toBeEnabled();
	});

	it('shows the encoder error and keeps the placeholder', async () => {
		generateBipBopVideo.mockRejectedValue(new Error('このコーデックはエンコードできません'));
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();
		await page.getByRole('button', { name: '生成' }).click();

		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('このコーデックはエンコードできません');
		await expect.element(page.getByRole('img', { name: '動画のプレースホルダー' })).toBeVisible();
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

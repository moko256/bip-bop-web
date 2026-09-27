import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OutputControls from './OutputControls.svelte';

describe('OutputControls', () => {
	it('starts on page and shows no category controls', async () => {
		render(OutputControls);

		await expect.element(page.getByRole('radio', { name: 'ページ' })).toBeChecked();
		await expect
			.element(page.getByRole('button', { name: 'ダウンロード' }))
			.not.toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).not.toBeInTheDocument();
	});

	it('shows video controls for mp4 and webm', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'mp4' }).click();

		await expect.element(page.getByRole('radio', { name: 'mp4' })).toBeChecked();
		await expect.element(page.getByRole('radio', { name: 'ページ' })).not.toBeChecked();
		await expect.element(page.getByRole('combobox', { name: '解像度' })).toHaveValue('1920x1080');
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.toHaveValue('h264');
		await expect
			.element(page.getByRole('combobox', { name: 'オーディオコーデック' }))
			.toHaveValue('aac');
		await expect.element(page.getByRole('button', { name: 'ダウンロード' })).toBeInTheDocument();
		await expect.element(page.getByRole('option', { name: '720×480' })).toBeInTheDocument();

		await page.getByRole('radio', { name: 'webm' }).click();

		await expect.element(page.getByRole('radio', { name: 'webm' })).toBeChecked();
		await expect.element(page.getByRole('button', { name: 'ダウンロード' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).not.toBeInTheDocument();
	});

	it('shows fullscreen url controls', async () => {
		render(OutputControls);

		await page.getByRole('radio', { name: 'フルスクリーンURL' }).click();

		await expect.element(page.getByRole('radio', { name: 'フルスクリーンURL' })).toBeChecked();
		await expect.element(page.getByRole('combobox', { name: '解像度' })).toBeInTheDocument();
		await expect.element(page.getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'コピー' })).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: '開く' })).toBeInTheDocument();
		await expect
			.element(page.getByRole('button', { name: 'ダウンロード' }))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByRole('combobox', { name: 'ビデオコーデック' }))
			.not.toBeInTheDocument();
	});
});

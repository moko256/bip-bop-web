import { getLocale, getTextDirection } from '$lib/paraglide/runtime';
import { createRawSnippet } from 'svelte';
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Layout from './+layout.svelte';

describe('document shell', () => {
	it('sets the document language and the viewport tags', async () => {
		render(Layout, {
			children: createRawSnippet(() => ({
				render: () => '<p>page body</p>'
			}))
		});

		await expect.element(page.getByText('page body')).toBeInTheDocument();
		await expect.poll(() => document.documentElement.lang).toBe(getLocale());
		expect(document.documentElement.dir).toBe(getTextDirection(getLocale()));
		const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '';
		expect(viewport).toContain('width=device-width');
		expect(viewport).toMatch(/initial-scale=1(?:\.0)?/);
		expect(document.querySelector('meta[name="text-scale"]')?.getAttribute('content')).toBe(
			'scale'
		);
	});
});

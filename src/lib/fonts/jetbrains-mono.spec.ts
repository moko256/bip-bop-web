import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { BIP_BOP_RENDERED_TEXTS } from '../bip-bop/renderer';
import {
	googleFontsStylesheetUrl,
	subsetText
} from '../../../scripts/download-jetbrains-mono.mjs';

describe('subsetText', () => {
	it('sorts code points and drops duplicates', () => {
		expect(subsetText(['Bop!', 'Bip!', '210', ':', '.'])).toBe('!.012:Biop');
	});

	it('builds the renderer subset used by the Google Fonts text parameter', () => {
		expect(subsetText(BIP_BOP_RENDERED_TEXTS)).toBe('!.0123456789:Biop');
	});
});

describe('googleFontsStylesheetUrl', () => {
	it('uses the CSS API shape from Google Fonts', () => {
		expect(googleFontsStylesheetUrl('JetBrains Mono', 'Hello')).toBe(
			'https://fonts.googleapis.com/css?family=JetBrains+Mono&text=Hello'
		);
	});
});

describe('committed JetBrains Mono subset', () => {
	it('points the stylesheet at a local woff2 and covers the renderer subset', async () => {
		const css = await readFile(new URL('./jetbrains-mono.css', import.meta.url), 'utf8');

		expect(css).toContain("font-family: 'JetBrains Mono'");
		expect(css).toContain('unicode-range: U+21, U+2e, U+30-3a, U+42, U+69, U+6f-70;');
		expect(css).not.toContain('fonts.gstatic.com');

		const urls = [...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)].map((match) => match[2]);
		expect(urls).toEqual(['./jetbrains-mono-0.woff2']);
		for (const url of urls) {
			const bytes = await readFile(new URL(url ?? '', import.meta.url));
			expect(bytes.subarray(0, 4).toString('ascii')).toBe('wOF2');
		}
	});
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import { compile } from 'sass-embedded';
import { describe, expect, it } from 'vitest';

const entry = fileURLToPath(new URL('./pico.scss', import.meta.url));

describe('Pico stylesheet', () => {
	const css = compile(entry, {
		style: 'compressed',
		loadPaths: ['node_modules'],
		quietDeps: true
	}).css;

	it('keeps every Pico module', () => {
		expect(css).toContain('.container');
		expect(css).toContain('.grid');
		expect(css).toContain('.overflow-auto');
		expect(css).toContain('article{');
		expect(css).toContain('button{');
		expect(css).toContain('code,kbd,samp{');
		expect(css).toContain('figure{');
		expect(css).toContain('table.striped');
		expect(css).toContain('[role=switch]');
		expect(css).toContain('[type=color]');
		expect(css).toContain('[type=file]');
		expect(css).toContain('[type=range]');
		expect(css).toContain('[type=search]');
		expect(css).toContain('[role=group]');
		expect(css).toContain('progress{');
		expect(css).toContain('nav,nav ul{');
		expect(css).toContain('[data-tooltip]');
		expect(css).toContain('dialog>');
		expect(css).toContain('details.dropdown');
		expect(css).toContain('--pico-icon-loading');
		expect(css).toContain('prefers-reduced-motion');
	});

	it('survives a Lightning CSS transform', () => {
		const { code } = transform({
			filename: 'pico.css',
			code: Buffer.from(css),
			minify: true
		});
		const minified = code.toString();

		expect(minified.length).toBeGreaterThan(0);
		expect(minified).toContain('.container');
		expect(minified).toContain('.grid');
		expect(minified).toContain('[data-tooltip]');
		expect(minified).toContain('--pico-icon-loading');
	});
});

describe('kiso.css', () => {
	const css = readFileSync(
		fileURLToPath(new URL('../../../node_modules/kiso.css/kiso.css', import.meta.url)),
		'utf8'
	);

	it('ships the reset used by the layout', () => {
		expect(css).toContain('text-autospace');
		expect(css).toContain('box-sizing: border-box');
	});
});

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import { compile } from 'sass-embedded';
import { describe, expect, it } from 'vitest';
const entry = fileURLToPath(new URL('./pico.scss', import.meta.url));

function compilePicoCss(): string {
	const css = compile(entry, {
		style: 'compressed',
		loadPaths: ['node_modules'],
		quietDeps: true
	}).css;

	const { code } = transform({
		filename: 'pico.css',
		code: Buffer.from(css),
		minify: true
	});

	return code.toString();
}

describe('Pico stylesheet', () => {
	const css = compilePicoCss();

	it('keeps the Pico modules used by the app', () => {
		expect(css).toContain('.container');
		expect(css).toContain('button{');
		expect(css).toContain('nav,nav ul{');
		expect(css).toContain('progress{');
		expect(css).toContain('[aria-busy=true]');
		expect(css).toContain('--pico-icon-loading');
		expect(css).toContain('[role=group]');
		expect(css).toContain('prefers-reduced-motion');
	});

	it('drops Pico modules the app does not use', () => {
		expect(css).not.toContain('.grid');
		expect(css).not.toContain('.overflow-auto');
		expect(css).not.toContain('table.striped');
		expect(css).not.toContain('[data-tooltip]');
		expect(css).not.toContain('dialog>');
		expect(css).not.toContain('details.dropdown');
	});

	it('uses the slate theme', () => {
		expect(css).toContain('--pico-primary:#5d6b89');
	});

	it('exposes page background colors for theme-color', () => {
		expect(css).toContain('--pico-background-color:#fff');
		expect(css).toContain('--pico-background-color:#13171f');
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

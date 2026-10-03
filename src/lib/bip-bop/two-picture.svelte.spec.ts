import Two from 'two.js';
import { describe, expect, it } from 'vitest';
import { BipBopRenderer, createBipBopDimensions } from './renderer';

function rgb(canvas: HTMLCanvasElement, x: number, y: number): string {
	const pixel = canvas.getContext('2d', { alpha: false })?.getImageData(x, y, 1, 1).data;
	if (!pixel) return '';
	return `${pixel[0]},${pixel[1]},${pixel[2]}`;
}

function webglRgb(canvas: OffscreenCanvas, x: number, y: number): string {
	const gl = canvas.getContext('webgl');
	if (!gl) return '';
	const pixel = new Uint8Array(4);
	gl.readPixels(x, canvas.height - 1 - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
	return `${pixel[0]},${pixel[1]},${pixel[2]}`;
}

describe('Two.js WebGL picture', () => {
	it('reuses one sized instance, draws with WebGL, and turns antialias off', () => {
		const canvas = new OffscreenCanvas(320, 180);
		const before = Two.Instances.length;
		const dimensions = createBipBopDimensions(320, 180);

		BipBopRenderer(canvas, dimensions, 0);

		expect(Two.Instances.length).toBe(before + 1);
		const two = Two.Instances.at(-1);
		expect(two?.width).toBe(320);
		expect(two?.height).toBe(180);
		expect(two?.type).toBe(Two.Types.webgl);
		expect(two?.renderer.domElement).toBe(canvas);
		expect(canvas.width).toBe(320);
		expect(canvas.height).toBe(180);
		expect(canvas.getContext('webgl')?.getContextAttributes()?.antialias).toBe(false);
		expect(webglRgb(canvas, canvas.width - 2, canvas.height - 2)).toBe('0,0,0');
		expect(webglRgb(canvas, 160, 90)).toBe('255,255,255');

		BipBopRenderer(canvas, dimensions, 1);

		expect(Two.Instances.length).toBe(before + 1);
		expect(Two.Instances.at(-1)).toBe(two);
		expect(webglRgb(canvas, canvas.width - 2, canvas.height - 2)).toBe('4,4,4');
	});

	it('passes a newly sized instance to the renderer when the bitmap changes', () => {
		const canvas = new OffscreenCanvas(320, 180);
		const before = Two.Instances.length;

		BipBopRenderer(canvas, createBipBopDimensions(320, 180), 0);
		const first = Two.Instances.at(-1);

		BipBopRenderer(canvas, createBipBopDimensions(640, 360), 0);

		expect(Two.Instances.length).toBe(before + 1);
		expect(Two.Instances.includes(first!)).toBe(false);
		const two = Two.Instances.at(-1);
		expect(two?.width).toBe(640);
		expect(two?.height).toBe(360);
		expect(two?.renderer.domElement).toBe(canvas);
		expect(canvas.width).toBe(640);
		expect(canvas.height).toBe(360);
		expect(canvas.getContext('webgl')?.getContextAttributes()?.antialias).toBe(false);
	});

	it('copies the OffscreenCanvas onto an html canvas without smoothing', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 1920;
		canvas.height = 1080;
		const before = Two.Instances.length;

		BipBopRenderer(canvas, createBipBopDimensions(1920, 1080), 0);

		expect(Two.Instances.length).toBe(before + 1);
		const domElement = Two.Instances.at(-1)?.renderer.domElement;
		expect(domElement).toBeInstanceOf(OffscreenCanvas);
		expect(domElement).not.toBe(canvas);
		expect(canvas.getContext('2d', { alpha: false })?.imageSmoothingEnabled).toBe(false);
		expect(rgb(canvas, 40, 990)).toBe('191,191,191');
		expect(rgb(canvas, 960, 540)).toBe('255,255,255');
		expect(rgb(canvas, canvas.width - 2, canvas.height - 2)).toBe('0,0,0');

		BipBopRenderer(canvas, createBipBopDimensions(1920, 1080), 60);
		expect(Two.Instances.length).toBe(before + 1);
		expect(rgb(canvas, canvas.width - 2, canvas.height - 2)).toBe('255,255,255');
	});
});

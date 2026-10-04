import { describe, expect, it } from 'vitest';
import { videoPictureAtFrame } from './media-time';
import { BipBopRenderer, createBipBopDimensions } from './renderer';

function rgb(canvas: HTMLCanvasElement, x: number, y: number): string {
	const pixel = canvas.getContext('2d', { alpha: false })?.getImageData(x, y, 1, 1).data;
	if (!pixel) return '';
	return `${pixel[0]},${pixel[1]},${pixel[2]}`;
}

function red(canvas: HTMLCanvasElement, x: number, y: number): number {
	return Number(rgb(canvas, x, y).split(',')[0]);
}

describe('BipBopRenderer pixels', () => {
	it('fills an odd bitmap with a gray arc and a white arc on whole pixels', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 201;
		canvas.height = 151;
		const dimensions = createBipBopDimensions(canvas.width, canvas.height);
		BipBopRenderer(canvas, dimensions, videoPictureAtFrame(15, 60));

		expect(dimensions).toMatchObject({ centerX: 101, centerY: 76, radius: 30 });
		// Frame 15 splits the disk at 91°. 45° is in the gray arc, 270° is in the white arc.
		expect(rgb(canvas, 112, 65)).toBe('128,128,128');
		expect(rgb(canvas, 85, 76)).toBe('255,255,255');
		expect(rgb(canvas, 73, 76)).toBe('255,255,255');
		expect(rgb(canvas, 121, 56)).toBe('128,128,128');
		expect(rgb(canvas, 129, 48)).toBe('64,64,64');
	});

	it('paints the sounding trace as one bitmap pixel on the axis and at the -cos peak', () => {
		const canvas = document.createElement('canvas');
		canvas.width = 1920;
		canvas.height = 1080;
		const dimensions = createBipBopDimensions(canvas.width, canvas.height);
		BipBopRenderer(canvas, dimensions, videoPictureAtFrame(0, 60));

		// Axis row 1012 is white. The rows above and below stay the black field.
		expect(rgb(canvas, 8, 1011)).toBe('0,0,0');
		expect(rgb(canvas, 8, 1012)).toBe('255,255,255');
		expect(rgb(canvas, 8, 1013)).toBe('0,0,0');
		// The first color swatch covers the trace. Its center stays 75% white.
		expect(rgb(canvas, 40, 1012)).toBe('191,191,191');
		// 15th peak of the 1500 Hz -cos sits on the upper edge, past the color bar.
		const above = red(canvas, 576, 994);
		const crest = red(canvas, 576, 995);
		const below = red(canvas, 576, 996);
		expect(above).toBe(0);
		expect(crest).toBeGreaterThan(below);
		expect(crest + below).toBeGreaterThan(240);
		expect(crest + below).toBeLessThanOrEqual(255);

		BipBopRenderer(canvas, dimensions, videoPictureAtFrame(1, 60));
		expect(rgb(canvas, 8, 1012)).toBe('4,4,4');
	});
});

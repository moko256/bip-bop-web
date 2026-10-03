import { describe, expect, it } from 'vitest';
import { videoPictureAtFrame } from './media-time';
import { BipBopRenderer, createBipBopDimensions } from './renderer';

function rgb(canvas: HTMLCanvasElement, x: number, y: number): string {
	const pixel = canvas.getContext('2d', { alpha: false })?.getImageData(x, y, 1, 1).data;
	if (!pixel) return '';
	return `${pixel[0]},${pixel[1]},${pixel[2]}`;
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
});

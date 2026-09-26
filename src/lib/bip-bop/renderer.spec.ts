import { describe, expect, it } from 'vitest';
import { BipBopRenderer, createBipBopDimensions } from './renderer';

type ArcCall = {
	x: number;
	y: number;
	radius: number;
	start: number;
	end: number;
};

class MockContext {
	fillStyle = '';
	font = '';
	textAlign = '';
	textBaseline = '';
	arcs: ArcCall[] = [];
	fills: string[] = [];
	texts: { text: string; baseline: string; x: number; y: number }[] = [];

	setTransform(): void {}

	fillRect(): void {
		this.fills.push(this.fillStyle);
	}

	beginPath(): void {}

	arc(x: number, y: number, radius: number, start: number, end: number): void {
		this.arcs.push({ x, y, radius, start, end });
	}

	moveTo(): void {}

	closePath(): void {}

	fill(): void {
		this.fills.push(this.fillStyle);
	}

	fillText(text: string, x: number, y: number): void {
		this.texts.push({ text, baseline: this.textBaseline, x, y });
	}
}

function draw(frame: number, width = 1920, height = 1080) {
	const context = new MockContext();
	const canvas = {
		getContext: () => context
	} as unknown as HTMLCanvasElement;
	const dimensions = createBipBopDimensions(width, height);
	BipBopRenderer(canvas, dimensions, frame);
	return { context, dimensions };
}

/** Degrees clockwise from 12 o'clock, matching the renderer. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

describe('createBipBopDimensions', () => {
	it('centers a circle whose diameter is one third of the height', () => {
		const dimensions = createBipBopDimensions(1920, 1080);

		expect(dimensions.centerX).toBe(960);
		expect(dimensions.centerY).toBe(540);
		expect(dimensions.radius).toBe(180);
		expect(dimensions.fontSize).toBe(90);
	});
});

describe('BipBopRenderer', () => {
	it('paints a black field, a gray circle, and a white sector from 1° to 360° on frame 0', () => {
		const { context, dimensions } = draw(0);
		const sector = context.arcs[1];

		expect(context.fills).toEqual(['#000000', '#808080', '#ffffff']);
		expect(context.arcs[0]).toMatchObject({
			x: dimensions.centerX,
			y: dimensions.centerY,
			radius: dimensions.radius
		});
		expect(sector?.start).toBeCloseTo(radiansFromTop(1));
		expect(sector?.end).toBeCloseTo(radiansFromTop(360));
		expect(sector?.radius).toBe(dimensions.radius);
	});

	it('advances the sector start by 6° each frame', () => {
		const frame0 = draw(0).context.arcs[1];
		const frame1 = draw(1).context.arcs[1];
		const frame59 = draw(59).context.arcs[1];
		const frame60 = draw(60).context.arcs[1];

		expect(frame1?.start).toBeCloseTo(radiansFromTop(7));
		expect(frame59?.start).toBeCloseTo(radiansFromTop(355));
		expect(frame60?.start).toBeCloseTo(frame0?.start ?? 0);
	});

	it('draws the counter below center and Bip! above center when the count divides by 60', () => {
		const atZero = draw(0).context.texts;
		const atOne = draw(1).context.texts;
		const atSixty = draw(60).context.texts;

		expect(atZero).toEqual([
			{ text: '0', baseline: 'top', x: 960, y: 540 },
			{ text: 'Bip!', baseline: 'bottom', x: 960, y: 540 }
		]);
		expect(atOne.map((text) => text.text)).toEqual(['1']);
		expect(atOne[0]?.baseline).toBe('top');
		expect(atSixty.map((text) => text.text)).toEqual(['60', 'Bip!']);
	});
});

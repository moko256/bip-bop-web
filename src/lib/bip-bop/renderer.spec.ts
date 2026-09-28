import { describe, expect, it } from 'vitest';
import {
	BIP_BOP_FONT_TEXT,
	BipBopRenderer,
	createBipBopDimensions,
	type BipBopVideoCorner
} from './renderer';

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
	imageSmoothingEnabled = true;
	arcs: ArcCall[] = [];
	fills: string[] = [];
	texts: {
		text: string;
		baseline: string;
		align: string;
		fill: string;
		x: number;
		y: number;
		font: string;
	}[] = [];

	rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];
	fonts: string[] = [];

	setTransform(): void {}

	fillRect(x: number, y: number, w: number, h: number): void {
		this.fills.push(this.fillStyle);
		this.rects.push({ x, y, w, h, fill: this.fillStyle });
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
		this.fonts.push(this.font);
		this.texts.push({
			text,
			baseline: this.textBaseline,
			align: this.textAlign,
			fill: this.fillStyle,
			x,
			y,
			font: this.font
		});
	}
}

function draw(frame: number, width = 1920, height = 1080, video?: BipBopVideoCorner) {
	const context = new MockContext();
	const canvas = {
		getContext: () => context
	} as unknown as HTMLCanvasElement;
	const dimensions = createBipBopDimensions(width, height);
	BipBopRenderer(canvas, dimensions, frame, video);
	return { context, dimensions };
}

/** Degrees clockwise from 12 o'clock, matching the renderer. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

describe('createBipBopDimensions', () => {
	it('sizes every drawn length as round(shortSide * fraction) on a 1920×1080 canvas', () => {
		const dimensions = createBipBopDimensions(1920, 1080);

		expect(dimensions.centerX).toBe(960);
		expect(dimensions.centerY).toBe(540);
		expect(dimensions.radius).toBe(216);
		expect(dimensions.overlayFontSize).toBe(34);
		expect(dimensions.frameFontSize).toBe(68);
		expect(dimensions.frameCountY).toBe(557);
		expect(dimensions.labelFontSize).toBe(90);
		expect(dimensions.labelY).toBe(523);
		expect(dimensions.clockFontSize).toBe(68);
		expect(dimensions.clockX).toBe(34);
		expect(dimensions.clockY).toBe(34);
		expect(dimensions.colorBarSize).toBe(68);
		expect(dimensions.colorBarX).toBe(34);
		expect(dimensions.colorBarY).toBe(978);
	});

	it('uses the short side and rounds half pixels, including an odd diameter', () => {
		const portrait = createBipBopDimensions(720, 1280);
		const uneven = createBipBopDimensions(1000, 2000);

		expect(portrait.radius).toBe(144);
		expect(portrait.overlayFontSize).toBe(23);
		expect(portrait.frameFontSize).toBe(45);
		expect(portrait.frameCountY).toBe(651);
		expect(portrait.labelFontSize).toBe(60);
		expect(portrait.labelY).toBe(629);
		expect(portrait.clockX).toBe(23);
		expect(portrait.clockY).toBe(23);
		expect(portrait.colorBarSize).toBe(45);
		expect(portrait.colorBarX).toBe(23);
		expect(portrait.colorBarY).toBe(1212);
		expect(uneven.radius).toBe(200);
		expect(uneven.overlayFontSize).toBe(32);
		expect(createBipBopDimensions(1003, 2000).radius).toBe(200.5);
		expect(uneven.colorBarSize).toBe(63);
		expect(uneven.colorBarX).toBe(31);
		expect(uneven.colorBarY).toBe(1906);
	});
});

describe('BipBopRenderer', () => {
	it('turns anti-aliasing off for canvas and video frames', () => {
		const { context } = draw(0);

		expect(context.imageSmoothingEnabled).toBe(false);
	});

	it('paints a black field, a gray circle, and a white sector from 1° to 360° on frame 0', () => {
		const { context, dimensions } = draw(0);
		const sector = context.arcs[1];

		expect(context.fills.slice(0, 3)).toEqual(['#000000', '#808080', '#ffffff']);
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

	it('draws the counter below center and alternates Bip! and Bop! above center each second', () => {
		const atZero = draw(0);
		const centered = (frame: ReturnType<typeof draw>) =>
			frame.context.texts.filter((text) => text.x === frame.dimensions.centerX);
		const atZeroCentered = centered(atZero);
		const atOne = centered(draw(1));
		const atSixty = centered(draw(60));
		const atOneTwenty = centered(draw(120));

		expect(atZeroCentered).toEqual([
			{
				text: '000000',
				baseline: 'top',
				align: 'center',
				fill: '#000000',
				x: 960,
				y: atZero.dimensions.frameCountY,
				font: '68px "JetBrains Mono", monospace'
			},
			{
				text: 'Bip!',
				baseline: 'bottom',
				align: 'center',
				fill: '#000000',
				x: 960,
				y: atZero.dimensions.labelY,
				font: '90px "JetBrains Mono", monospace'
			}
		]);
		expect(atOne.map((text) => text.text)).toEqual(['000001']);
		expect(atOne[0]?.baseline).toBe('top');
		expect(atOne[0]?.y).toBe(atZero.dimensions.frameCountY);
		expect(atSixty).toEqual([
			{
				text: '000060',
				baseline: 'top',
				align: 'center',
				fill: '#000000',
				x: 960,
				y: atZero.dimensions.frameCountY,
				font: '68px "JetBrains Mono", monospace'
			},
			{
				text: 'Bop!',
				baseline: 'bottom',
				align: 'center',
				fill: '#ffffff',
				x: 960,
				y: atZero.dimensions.labelY,
				font: '90px "JetBrains Mono", monospace'
			}
		]);
		expect(atOneTwenty.map((text) => text.text)).toEqual(['000120', 'Bip!']);
		expect(atOneTwenty[1]?.fill).toBe('#000000');
	});

	it('ping-pongs field, circle, sector, and clock colors over 2 seconds', () => {
		const atHalf = draw(30);
		const atSecond = draw(60);
		const atReturn = draw(120);

		expect(atHalf.context.fills.slice(0, 3)).toEqual(['#808080', '#c0c0c0', '#c0c0c0']);
		expect(atHalf.context.texts.find((text) => text.align === 'left')?.fill).toBe('#808080');
		expect(atSecond.context.fills.slice(0, 3)).toEqual(['#ffffff', '#ffffff', '#808080']);
		expect(atSecond.context.texts.find((text) => text.align === 'left')?.fill).toBe('#000000');
		expect(atReturn.context.fills.slice(0, 3)).toEqual(['#000000', '#808080', '#ffffff']);
		expect(atReturn.context.texts.find((text) => text.align === 'left')?.fill).toBe('#ffffff');
		expect(draw(90).context.fills.slice(0, 3)).toEqual(atHalf.context.fills.slice(0, 3));
	});

	it('draws the counter, the labels, the clock, and the corner in JetBrains Mono', () => {
		const { context, dimensions } = draw(0);
		const counter = `${dimensions.frameFontSize}px "JetBrains Mono", monospace`;
		const label = `${dimensions.labelFontSize}px "JetBrains Mono", monospace`;
		const clock = `${dimensions.clockFontSize}px "JetBrains Mono", monospace`;
		const corner = `${dimensions.overlayFontSize}px "JetBrains Mono", monospace`;

		expect(context.fonts).toEqual([counter, label, clock, corner]);
	});

	it('requests the font subset as one precomposed string', () => {
		expect(BIP_BOP_FONT_TEXT).toBe(
			'!#$&-^_.+/:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
		);
	});

	it('lists every character the renderer paints', () => {
		const pageFrames = [0, 3, 60, 120, 987654, 60 * 3661 + 30].flatMap((frame) =>
			draw(frame).context.texts.map((text) => text.text)
		);
		const videoFrames = [
			draw(0, 1920, 1080, { mimeType: 'video/mp4', videoFormat: 'mp4' }),
			draw(0, 720, 480, { mimeType: 'video/webm', videoFormat: 'webm' })
		].flatMap((frame) => frame.context.texts.map((text) => text.text));
		const drawn = [...pageFrames, ...videoFrames].join('');
		const listed = new Set(BIP_BOP_FONT_TEXT);

		expect([...new Set(drawn)].filter((char) => !listed.has(char))).toEqual([]);
	});

	it('draws elapsed time at the top-left as HH:MM:SS.CC', () => {
		const { context, dimensions } = draw(0);
		const clock = context.texts.find((text) => text.align === 'left');

		expect(clock).toEqual({
			text: '00:00:00.00',
			baseline: 'top',
			align: 'left',
			fill: '#ffffff',
			x: dimensions.clockX,
			y: dimensions.clockY,
			font: `${dimensions.clockFontSize}px "JetBrains Mono", monospace`
		});
		expect(draw(1).context.texts.find((text) => text.align === 'left')?.text).toBe('00:00:00.01');
		expect(draw(30).context.texts.find((text) => text.align === 'left')?.text).toBe('00:00:00.50');
		expect(draw(60).context.texts.find((text) => text.align === 'left')?.text).toBe('00:00:01.00');
		expect(draw(60 * 3661 + 30).context.texts.find((text) => text.align === 'left')?.text).toBe(
			'01:01:01.50'
		);
	});

	it('draws only the resolution at the top-right on a page', () => {
		const landscape = draw(0, 1920, 1080);
		const portrait = draw(0, 720, 1280);

		expect(landscape.context.texts.filter((text) => text.align === 'right')).toEqual([
			{
				text: '1920x1080',
				baseline: 'top',
				align: 'right',
				fill: '#ffffff',
				x: 1920 - landscape.dimensions.clockX,
				y: landscape.dimensions.clockY,
				font: '34px "JetBrains Mono", monospace'
			}
		]);
		expect(portrait.context.texts.filter((text) => text.align === 'right')).toEqual([
			{
				text: '720x1280',
				baseline: 'top',
				align: 'right',
				fill: '#ffffff',
				x: 720 - portrait.dimensions.clockX,
				y: portrait.dimensions.clockY,
				font: '23px "JetBrains Mono", monospace'
			}
		]);
	});

	it('draws the mime type and video format under the resolution', () => {
		const { context, dimensions } = draw(60, 1920, 1080, {
			mimeType: 'video/mp4',
			videoFormat: 'mp4'
		});
		const corner = context.texts.filter((text) => text.align === 'right');

		expect(corner).toEqual([
			{
				text: '1920x1080',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY,
				font: '34px "JetBrains Mono", monospace'
			},
			{
				text: 'video/mp4',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY + dimensions.overlayFontSize,
				font: '34px "JetBrains Mono", monospace'
			},
			{
				text: 'mp4',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY + dimensions.overlayFontSize * 2,
				font: '34px "JetBrains Mono", monospace'
			}
		]);
	});

	it('draws a 75% sRGB color bar as seven squares along the bottom-left', () => {
		const { context } = draw(0, 1920, 1080);
		const squares = context.rects.slice(1);

		expect(squares).toEqual([
			{ x: 34, y: 978, w: 68, h: 68, fill: '#bfbfbf' },
			{ x: 102, y: 978, w: 68, h: 68, fill: '#bfbf00' },
			{ x: 170, y: 978, w: 68, h: 68, fill: '#00bfbf' },
			{ x: 238, y: 978, w: 68, h: 68, fill: '#00bf00' },
			{ x: 306, y: 978, w: 68, h: 68, fill: '#bf00bf' },
			{ x: 374, y: 978, w: 68, h: 68, fill: '#bf0000' },
			{ x: 442, y: 978, w: 68, h: 68, fill: '#0000bf' }
		]);
	});

	it('uses the width as the short side when the canvas is portrait', () => {
		const squares = draw(0, 720, 1280).context.rects.slice(1);

		expect(squares[0]).toEqual({ x: 23, y: 1212, w: 45, h: 45, fill: '#bfbfbf' });
		expect(squares[6]).toEqual({ x: 293, y: 1212, w: 45, h: 45, fill: '#0000bf' });
	});
});

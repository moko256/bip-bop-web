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

	it('uses the short side and rounds center, radius, and an odd diameter to whole pixels', () => {
		const portrait = createBipBopDimensions(720, 1280);
		const uneven = createBipBopDimensions(1000, 2000);
		const odd = createBipBopDimensions(1003, 2001);

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
		expect(uneven.colorBarSize).toBe(63);
		expect(uneven.colorBarX).toBe(31);
		expect(uneven.colorBarY).toBe(1906);
		expect(odd).toMatchObject({
			width: 1003,
			height: 2001,
			centerX: 502,
			centerY: 1001,
			radius: 201,
			frameFontSize: 63,
			frameCountY: 1017,
			labelFontSize: 84,
			labelY: 985,
			clockFontSize: 63,
			clockX: 31,
			clockY: 31,
			overlayFontSize: 32,
			colorBarSize: 63,
			colorBarX: 31,
			colorBarY: 1907
		});
	});

	it('rounds a fractional bitmap before measuring padding and text', () => {
		expect(createBipBopDimensions(100.5, 80.4)).toMatchObject({
			width: 101,
			height: 80,
			centerX: 51,
			centerY: 40,
			radius: 16,
			frameFontSize: 5,
			frameCountY: 41,
			labelFontSize: 7,
			labelY: 39,
			clockFontSize: 5,
			clockX: 3,
			clockY: 3,
			overlayFontSize: 3,
			colorBarSize: 5,
			colorBarX: 3,
			colorBarY: 72
		});
	});
});

describe('BipBopRenderer', () => {
	it('turns anti-aliasing off for canvas and video frames', () => {
		const { context } = draw(0);

		expect(context.imageSmoothingEnabled).toBe(false);
	});

	it('keeps the 2d context when the canvas size stays the same', () => {
		let calls = 0;
		const context = new MockContext();
		const canvas = {
			getContext: () => {
				calls += 1;
				return context;
			}
		} as unknown as HTMLCanvasElement;
		const dimensions = createBipBopDimensions(320, 180);

		BipBopRenderer(canvas, dimensions, 0);
		BipBopRenderer(canvas, dimensions, 1);

		expect(calls).toBe(1);
		expect(context.imageSmoothingEnabled).toBe(false);

		BipBopRenderer(canvas, createBipBopDimensions(640, 360), 0);
		expect(calls).toBe(2);
	});

	it('paints a black field and two arcs, gray from 0° to 1° and white from 1° to 360°, on frame 0', () => {
		const { context, dimensions } = draw(0);
		const [backing, sector] = context.arcs;

		expect(context.fills.slice(0, 3)).toEqual(['#000000', '#808080', '#ffffff']);
		expect(context.arcs).toHaveLength(2);
		expect(backing).toMatchObject({
			x: dimensions.centerX,
			y: dimensions.centerY,
			radius: dimensions.radius
		});
		expect(backing?.start).toBeCloseTo(radiansFromTop(0));
		expect(backing?.end).toBeCloseTo(radiansFromTop(1));
		expect(sector?.start).toBeCloseTo(radiansFromTop(1));
		expect(sector?.end).toBeCloseTo(radiansFromTop(360));
		expect(sector?.radius).toBe(dimensions.radius);
	});

	it('starts the sector at 1° and sweeps the leading edge 6° clockwise each frame', () => {
		const sector = (frame: number) => {
			const arcs = draw(frame).context.arcs;
			expect(arcs).toHaveLength(2);
			return arcs[1];
		};

		expect(sector(0)?.start).toBeCloseTo(radiansFromTop(1));
		expect(sector(0)?.end).toBeCloseTo(radiansFromTop(360));
		expect(sector(1)?.start).toBeCloseTo(radiansFromTop(7));
		expect(sector(30)?.start).toBeCloseTo(radiansFromTop(181));
		expect(sector(59)?.start).toBeCloseTo(radiansFromTop(355));
		expect(sector(60)?.start).toBeCloseTo(radiansFromTop(1));
		expect(sector(119)?.start).toBeCloseTo(radiansFromTop(355));
		expect(sector(120)?.start).toBeCloseTo(radiansFromTop(1));
		expect(sector(3599)?.start).toBeCloseTo(radiansFromTop(355));
		expect(sector(3600)?.start).toBeCloseTo(radiansFromTop(1));
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

	it('ping-pongs field and clock colors, and switches circle and sector colors each second', () => {
		const atHalf = draw(30);
		const atSecond = draw(60);
		const atNextHalf = draw(90);
		const atReturn = draw(120);

		expect(atHalf.context.fills.slice(0, 3)).toEqual(['#808080', '#808080', '#ffffff']);
		expect(draw(59).context.fills.slice(0, 3)).toEqual(['#fbfbfb', '#808080', '#ffffff']);
		expect(atHalf.context.texts.find((text) => text.align === 'left')?.fill).toBe('#808080');
		expect(atSecond.context.fills.slice(0, 3)).toEqual(['#ffffff', '#ffffff', '#808080']);
		expect(atSecond.context.texts.find((text) => text.align === 'left')?.fill).toBe('#000000');
		expect(atNextHalf.context.fills.slice(0, 3)).toEqual(['#808080', '#ffffff', '#808080']);
		expect(draw(119).context.fills.slice(1, 3)).toEqual(['#ffffff', '#808080']);
		expect(atReturn.context.fills.slice(0, 3)).toEqual(['#000000', '#808080', '#ffffff']);
		expect(atReturn.context.texts.find((text) => text.align === 'left')?.fill).toBe('#ffffff');
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
			draw(0, 1920, 1080, {
				mimeType: 'video/mp4',
				videoCodec: 'avc',
				audioCodec: 'aac',
				videoQuality: 'high',
				fps: 60
			}),
			draw(0, 720, 480, {
				mimeType: 'video/webm',
				videoCodec: 'vp9',
				audioCodec: 'opus',
				videoQuality: 'very-high',
				fps: 23.976
			})
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

	it('draws the mime type, codecs, quality, and frame rate under the resolution', () => {
		const { context, dimensions } = draw(60, 1920, 1080, {
			mimeType: 'video/mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			videoQuality: 'high',
			fps: 60
		});
		const corner = context.texts.filter((text) => text.align === 'right');
		const line = (text: string, index: number) => ({
			text,
			baseline: 'top' as const,
			align: 'right' as const,
			fill: '#000000',
			x: 1920 - dimensions.clockX,
			y: dimensions.clockY + dimensions.overlayFontSize * index,
			font: '34px "JetBrains Mono", monospace'
		});

		expect(corner).toEqual([
			line('1920x1080', 0),
			line('video/mp4', 1),
			line('avc', 2),
			line('aac', 3),
			line('high', 4),
			line('60FPS', 5)
		]);
	});

	it('follows media time when the video frame rate is not 60', () => {
		const half = draw(12, 1920, 1080, {
			mimeType: 'video/mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			videoQuality: 'high',
			fps: 24
		});
		const second = draw(24, 1920, 1080, {
			mimeType: 'video/mp4',
			videoCodec: 'avc',
			audioCodec: 'aac',
			videoQuality: 'high',
			fps: 24
		});

		expect(half.context.texts.find((text) => text.align === 'left')?.text).toBe('00:00:00.50');
		expect(half.context.texts.map((text) => text.text)).not.toContain('Bop!');
		expect(second.context.texts.find((text) => text.align === 'left')?.text).toBe('00:00:01.00');
		expect(second.context.texts.map((text) => text.text)).toContain('Bop!');
		expect(second.context.texts.filter((text) => text.align === 'right').at(-1)?.text).toBe(
			'24FPS'
		);
		expect(half.context.fills.slice(0, 3)).toEqual(draw(30).context.fills.slice(0, 3));
	});

	it('rounds arc, padding, text, and swatch geometry to whole pixels', () => {
		const context = new MockContext();
		const canvas = {
			getContext: () => context
		} as unknown as HTMLCanvasElement;

		BipBopRenderer(
			canvas,
			{
				width: 100.5,
				height: 80.4,
				centerX: 50.5,
				centerY: 40.5,
				radius: 20.5,
				frameFontSize: 10.4,
				frameCountY: 45.6,
				labelFontSize: 12.5,
				labelY: 30.2,
				clockFontSize: 10.4,
				clockX: 3.5,
				clockY: 3.4,
				overlayFontSize: 5.5,
				colorBarSize: 10.6,
				colorBarX: 3.5,
				colorBarY: 66.4
			},
			0
		);

		expect(context.arcs.map(({ x, y, radius }) => ({ x, y, radius }))).toEqual([
			{ x: 51, y: 41, radius: 21 },
			{ x: 51, y: 41, radius: 21 }
		]);
		expect(context.texts.map(({ text, x, y, font }) => ({ text, x, y, font }))).toEqual([
			{ text: '000000', x: 51, y: 46, font: '10px "JetBrains Mono", monospace' },
			{ text: 'Bip!', x: 51, y: 30, font: '13px "JetBrains Mono", monospace' },
			{ text: '00:00:00.00', x: 4, y: 3, font: '10px "JetBrains Mono", monospace' },
			{ text: '101x80', x: 97, y: 3, font: '6px "JetBrains Mono", monospace' }
		]);
		expect(context.rects[0]).toMatchObject({ x: 0, y: 0, w: 101, h: 80 });
		expect(context.rects[1]).toMatchObject({ x: 4, y: 66, w: 11, h: 11 });
		expect(context.rects[2]).toMatchObject({ x: 15, y: 66, w: 11, h: 11 });
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

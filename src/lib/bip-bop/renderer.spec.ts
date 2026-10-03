import { describe, expect, it } from 'vitest';
import type { Picture } from './picture';
import {
	BIP_BOP_FONT_FAMILY,
	BIP_BOP_FONT_TEXT,
	createBipBopDimensions,
	paintBipBop,
	type BipBopVideoCorner
} from './renderer';

const FONT_FAMILY = `"${BIP_BOP_FONT_FAMILY}", monospace`;

class RecordingPicture implements Picture {
	rects: { x: number; y: number; w: number; h: number; fill: string }[] = [];
	circles: { x: number; y: number; radius: number; fill: string }[] = [];
	sectors: {
		x: number;
		y: number;
		radius: number;
		start: number;
		end: number;
		fill: string;
	}[] = [];
	texts: {
		text: string;
		baseline: string;
		align: string;
		fill: string;
		x: number;
		y: number;
		size: number;
		family: string;
	}[] = [];

	fillRect(x: number, y: number, w: number, h: number, fill: string): void {
		this.rects.push({ x, y, w, h, fill });
	}

	fillCircle(x: number, y: number, radius: number, fill: string): void {
		this.circles.push({ x, y, radius, fill });
	}

	fillSector(x: number, y: number, radius: number, start: number, end: number, fill: string): void {
		this.sectors.push({ x, y, radius, start, end, fill });
	}

	fillText(
		text: string,
		x: number,
		y: number,
		style: {
			size: number;
			family: string;
			align: 'left' | 'center' | 'right';
			baseline: 'top' | 'bottom';
			fill: string;
		}
	): void {
		this.texts.push({
			text,
			baseline: style.baseline,
			align: style.align,
			fill: style.fill,
			x,
			y,
			size: style.size,
			family: style.family
		});
	}
}

function draw(frame: number, width = 1920, height = 1080, video?: BipBopVideoCorner) {
	const picture = new RecordingPicture();
	const dimensions = createBipBopDimensions(width, height);
	paintBipBop(picture, dimensions, frame, video);
	return { picture, dimensions };
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

describe('paintBipBop', () => {
	it('paints a black field, a gray circle, and a white sector from 1° to 360° on frame 0', () => {
		const { picture, dimensions } = draw(0);
		const sector = picture.sectors[0];

		expect(picture.rects[0]?.fill).toBe('#000000');
		expect(picture.circles[0]?.fill).toBe('#808080');
		expect(sector?.fill).toBe('#ffffff');
		expect(picture.circles[0]).toMatchObject({
			x: dimensions.centerX,
			y: dimensions.centerY,
			radius: dimensions.radius
		});
		expect(sector?.start).toBe(1);
		expect(sector?.end).toBe(360);
		expect(sector?.radius).toBe(dimensions.radius);
	});

	it('starts the sector at 1° and sweeps the leading edge 6° clockwise each frame', () => {
		const sector = (frame: number) => draw(frame).picture.sectors[0];

		expect(sector(0)?.start).toBe(1);
		expect(sector(0)?.end).toBe(360);
		expect(sector(1)?.start).toBe(7);
		expect(sector(30)?.start).toBe(181);
		expect(sector(59)?.start).toBe(355);
		expect(sector(60)?.start).toBe(1);
		expect(sector(119)?.start).toBe(355);
		expect(sector(120)?.start).toBe(1);
		expect(sector(3599)?.start).toBe(355);
		expect(sector(3600)?.start).toBe(1);
	});

	it('draws the counter below center and alternates Bip! and Bop! above center each second', () => {
		const atZero = draw(0);
		const centered = (frame: ReturnType<typeof draw>) =>
			frame.picture.texts.filter((text) => text.x === frame.dimensions.centerX);
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
				size: 68,
				family: FONT_FAMILY
			},
			{
				text: 'Bip!',
				baseline: 'bottom',
				align: 'center',
				fill: '#000000',
				x: 960,
				y: atZero.dimensions.labelY,
				size: 90,
				family: FONT_FAMILY
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
				size: 68,
				family: FONT_FAMILY
			},
			{
				text: 'Bop!',
				baseline: 'bottom',
				align: 'center',
				fill: '#ffffff',
				x: 960,
				y: atZero.dimensions.labelY,
				size: 90,
				family: FONT_FAMILY
			}
		]);
		expect(atOneTwenty.map((text) => text.text)).toEqual(['000120', 'Bip!']);
		expect(atOneTwenty[1]?.fill).toBe('#000000');
	});

	it('ping-pongs field and clock colors, and switches circle and sector colors each second', () => {
		const fills = (frame: number) => {
			const picture = draw(frame).picture;
			return [picture.rects[0]?.fill, picture.circles[0]?.fill, picture.sectors[0]?.fill];
		};
		const clockFill = (frame: number) =>
			draw(frame).picture.texts.find((text) => text.align === 'left')?.fill;

		expect(fills(30)).toEqual(['#808080', '#808080', '#ffffff']);
		expect(fills(59)).toEqual(['#fbfbfb', '#808080', '#ffffff']);
		expect(clockFill(30)).toBe('#808080');
		expect(fills(60)).toEqual(['#ffffff', '#ffffff', '#808080']);
		expect(clockFill(60)).toBe('#000000');
		expect(fills(90)).toEqual(['#808080', '#ffffff', '#808080']);
		expect(fills(119).slice(1)).toEqual(['#ffffff', '#808080']);
		expect(fills(120)).toEqual(['#000000', '#808080', '#ffffff']);
		expect(clockFill(120)).toBe('#ffffff');
	});

	it('draws the counter, the labels, the clock, and the corner in JetBrains Mono', () => {
		const { picture, dimensions } = draw(0);

		expect(picture.texts.map((text) => [text.size, text.family])).toEqual([
			[dimensions.frameFontSize, FONT_FAMILY],
			[dimensions.labelFontSize, FONT_FAMILY],
			[dimensions.clockFontSize, FONT_FAMILY],
			[dimensions.overlayFontSize, FONT_FAMILY]
		]);
	});

	it('requests the font subset as one precomposed string', () => {
		expect(BIP_BOP_FONT_TEXT).toBe(
			'!#$&-^_.+/:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
		);
	});

	it('lists every character the renderer paints', () => {
		const pageFrames = [0, 3, 60, 120, 987654, 60 * 3661 + 30].flatMap((frame) =>
			draw(frame).picture.texts.map((text) => text.text)
		);
		const videoFrames = [
			draw(0, 1920, 1080, { mimeType: 'video/mp4', videoCodec: 'avc', audioCodec: 'aac' }),
			draw(0, 720, 480, { mimeType: 'video/webm', videoCodec: 'vp9', audioCodec: 'opus' })
		].flatMap((frame) => frame.picture.texts.map((text) => text.text));
		const drawn = [...pageFrames, ...videoFrames].join('');
		const listed = new Set(BIP_BOP_FONT_TEXT);

		expect([...new Set(drawn)].filter((char) => !listed.has(char))).toEqual([]);
	});

	it('draws elapsed time at the top-left as HH:MM:SS.CC', () => {
		const { picture, dimensions } = draw(0);
		const clock = picture.texts.find((text) => text.align === 'left');

		expect(clock).toEqual({
			text: '00:00:00.00',
			baseline: 'top',
			align: 'left',
			fill: '#ffffff',
			x: dimensions.clockX,
			y: dimensions.clockY,
			size: dimensions.clockFontSize,
			family: FONT_FAMILY
		});
		expect(draw(1).picture.texts.find((text) => text.align === 'left')?.text).toBe('00:00:00.01');
		expect(draw(30).picture.texts.find((text) => text.align === 'left')?.text).toBe('00:00:00.50');
		expect(draw(60).picture.texts.find((text) => text.align === 'left')?.text).toBe('00:00:01.00');
		expect(draw(60 * 3661 + 30).picture.texts.find((text) => text.align === 'left')?.text).toBe(
			'01:01:01.50'
		);
	});

	it('draws only the resolution at the top-right on a page', () => {
		const landscape = draw(0, 1920, 1080);
		const portrait = draw(0, 720, 1280);

		expect(landscape.picture.texts.filter((text) => text.align === 'right')).toEqual([
			{
				text: '1920x1080',
				baseline: 'top',
				align: 'right',
				fill: '#ffffff',
				x: 1920 - landscape.dimensions.clockX,
				y: landscape.dimensions.clockY,
				size: 34,
				family: FONT_FAMILY
			}
		]);
		expect(portrait.picture.texts.filter((text) => text.align === 'right')).toEqual([
			{
				text: '720x1280',
				baseline: 'top',
				align: 'right',
				fill: '#ffffff',
				x: 720 - portrait.dimensions.clockX,
				y: portrait.dimensions.clockY,
				size: 23,
				family: FONT_FAMILY
			}
		]);
	});

	it('draws the mime type and codecs under the resolution', () => {
		const { picture, dimensions } = draw(60, 1920, 1080, {
			mimeType: 'video/mp4',
			videoCodec: 'avc',
			audioCodec: 'aac'
		});
		const corner = picture.texts.filter((text) => text.align === 'right');

		expect(corner).toEqual([
			{
				text: '1920x1080',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY,
				size: 34,
				family: FONT_FAMILY
			},
			{
				text: 'video/mp4',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY + dimensions.overlayFontSize,
				size: 34,
				family: FONT_FAMILY
			},
			{
				text: 'avc',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY + dimensions.overlayFontSize * 2,
				size: 34,
				family: FONT_FAMILY
			},
			{
				text: 'aac',
				baseline: 'top',
				align: 'right',
				fill: '#000000',
				x: 1920 - dimensions.clockX,
				y: dimensions.clockY + dimensions.overlayFontSize * 3,
				size: 34,
				family: FONT_FAMILY
			}
		]);
	});

	it('draws a 75% sRGB color bar as seven squares along the bottom-left', () => {
		const squares = draw(0, 1920, 1080).picture.rects.slice(1);

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
		const squares = draw(0, 720, 1280).picture.rects.slice(1);

		expect(squares[0]).toEqual({ x: 23, y: 1212, w: 45, h: 45, fill: '#bfbfbf' });
		expect(squares[6]).toEqual({ x: 293, y: 1212, w: 45, h: 45, fill: '#0000bf' });
	});
});

import { formatFpsOverlay } from './fps-text';
import type { FramePicture } from './media-time';
import { BIP_BOP_FPS } from './timeline';

/** One drawing cycle is one Timeline second. */
const CYCLE_FRAMES = BIP_BOP_FPS;
const BLACK = '#000000';

type Rgb = readonly [number, number, number];

const RGB_BLACK: Rgb = [0, 0, 0];
const RGB_WHITE: Rgb = [255, 255, 255];
const RGB_GRAY: Rgb = [128, 128, 128];

/**
 * 75% color bar: 75% amplitude, 100% saturation, sRGB.
 * An "on" channel is 0.75 × 255, which rounds to 191 (0xbf). An "off" channel is 0.
 */
const COLOR_BAR_75 = [
	'#bfbfbf',
	'#bfbf00',
	'#00bfbf',
	'#00bf00',
	'#bf00bf',
	'#bf0000',
	'#0000bf'
] as const;

/** Label above center on even seconds. */
const BIP_LABEL = 'Bip!';
/** Label above center on odd seconds. */
const BOP_LABEL = 'Bop!';
const CLOCK_TIME_SEPARATOR = ':';
const CLOCK_FRACTION_SEPARATOR = '.';

/** Family for every canvas and video label. Subset files live in `$lib/fonts`. */
export const BIP_BOP_FONT_FAMILY = 'JetBrains Mono';

/**
 * Subset {@link BIP_BOP_FONT_FAMILY} is built from. One string, sent unchanged by
 * `scripts/download-jetbrains-mono.mjs`: RFC 6838 restricted-name symbols
 * (`!#$&-^_.+`), the MIME type slash, the clock colon, ASCII digits,
 * and ASCII letters.
 */
export const BIP_BOP_FONT_TEXT =
	'!#$&-^_.+/:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Layout shared by the web preview and the video exporter.
 * Every value is a whole pixel. Lengths along the short side are
 * `round(shortSide * fraction)`, where `shortSide` is the lesser of the
 * rounded canvas width and height. Center, radius, padding, text size,
 * coordinates, width, and height are rounded so canvas and video drawing
 * stays on pixel boundaries.
 */
export type BipBopDimensions = {
	width: number;
	height: number;
	/** `round(width / 2)` after width is rounded. */
	centerX: number;
	/** `round(height / 2)` after height is rounded. */
	centerY: number;
	/** Both arcs. `round(round(shortSide * 2/5) / 2)`. */
	radius: number;
	/** Frame counter. Height is `round(shortSide * 1/16)`. */
	frameFontSize: number;
	/** Top of the frame counter. The gap below center is `round(shortSide * 1/64)`. */
	frameCountY: number;
	/** `Bip!` / `Bop!`. Height is `round(shortSide * 1/12)`. */
	labelFontSize: number;
	/** Bottom of `Bip!` / `Bop!`. The gap above center is `round(shortSide * 1/64)`. */
	labelY: number;
	/** Elapsed clock. Height is `round(shortSide * 1/16)`. */
	clockFontSize: number;
	/** Left inset of the clock. `round(shortSide * 1/32)`. */
	clockX: number;
	/** Top inset of the clock. `round(shortSide * 1/32)`. */
	clockY: number;
	/**
	 * Top-right resolution, and for a video the MIME type and video/audio codecs.
	 * Height is `round(clockFontSize / 2)`.
	 */
	overlayFontSize: number;
	/** Side of each 75% color-bar square. Height is `round(shortSide * 1/16)`. */
	colorBarSize: number;
	/** Left inset of the color bar. `round(shortSide * 1/32)`. */
	colorBarX: number;
	/** Top of the color bar. The bottom inset is `round(shortSide * 1/32)`. */
	colorBarY: number;
};

export function createBipBopDimensions(width: number, height: number): BipBopDimensions {
	const bitmapWidth = wholePixels(width);
	const bitmapHeight = wholePixels(height);
	const shortSide = Math.min(bitmapWidth, bitmapHeight);
	const inset = pixelsAlongShortSide(shortSide, 1, 32);
	const centerGap = pixelsAlongShortSide(shortSide, 1, 64);
	const textHeight = pixelsAlongShortSide(shortSide, 1, 16);
	const diameter = pixelsAlongShortSide(shortSide, 2, 5);
	const centerX = wholePixels(bitmapWidth / 2);
	const centerY = wholePixels(bitmapHeight / 2);

	return {
		width: bitmapWidth,
		height: bitmapHeight,
		centerX,
		centerY,
		radius: wholePixels(diameter / 2),
		frameFontSize: textHeight,
		frameCountY: centerY + centerGap,
		labelFontSize: pixelsAlongShortSide(shortSide, 1, 12),
		labelY: centerY - centerGap,
		clockFontSize: textHeight,
		clockX: inset,
		clockY: inset,
		overlayFontSize: wholePixels(textHeight / 2),
		colorBarSize: textHeight,
		colorBarX: inset,
		colorBarY: bitmapHeight - inset - textHeight
	};
}

/** `Math.round(shortSide * numerator / denominator)`, in whole pixels. */
function pixelsAlongShortSide(shortSide: number, numerator: number, denominator: number): number {
	return wholePixels((shortSide * numerator) / denominator);
}

/** Nearest whole pixel, so canvas and video drawing does not sit between pixels. */
function wholePixels(value: number): number {
	return Math.round(value);
}

type BipBopCanvas = HTMLCanvasElement | OffscreenCanvas;
type BipBopContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

type PreparedContext = {
	ctx: BipBopContext;
	width: number;
	height: number;
};

const preparedContexts = new WeakMap<BipBopCanvas, PreparedContext>();

/** One 2d context per canvas. A size change configures it again. */
function prepareContext(canvas: BipBopCanvas, width: number, height: number): BipBopContext | null {
	const prepared = preparedContexts.get(canvas);
	if (prepared && prepared.width === width && prepared.height === height) return prepared.ctx;

	const ctx = canvas.getContext('2d', { alpha: false }) as BipBopContext | null;
	if (!ctx) return null;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = false;
	preparedContexts.set(canvas, { ctx, width, height });
	return ctx;
}

export type BipBopVideoCorner = {
	mimeType: string;
	videoCodec: string;
	audioCodec: string;
	videoQuality: string;
	fps: number;
};

/**
 * Draws one frame. Stateless: the caller owns the frame counter, the clock,
 * and the motion. The frame count is only the digits in the center.
 * `dimensions` must match the canvas bitmap (`canvas.width` / `canvas.height`).
 * Angles are degrees clockwise from 12 o'clock.
 * The disk is two filled arcs that meet at the center. At cycle fraction 0 the
 * split is 1°: one arc runs 0°–1° and the other 1°–360°. The split then moves
 * clockwise and completes one turn as {@link FramePicture.cycleFraction}
 * completes one {@link FramePicture.cycleLength}.
 * A Bip second paints the 0°–split arc gray and the split–360° arc white.
 * A Bop second swaps those fills. Field and clock colors ping-pong across the
 * two seconds, black toward white through the Bip second and back through the
 * Bop second. `sample.showBeat` draws `Bip!` or `Bop!` above center for
 * `sample.beat`.
 * The corner clock is `sample.clockCentiseconds`, truncated by the caller
 * (`HH:MM:SS.CC`).
 * The center counter is the frame index, zero-padded to 6 digits. Its top sits
 * `round(shortSide * 1/64)` below center, and its height is `round(shortSide * 1/16)`.
 * `Bip!` / `Bop!` sit above center with `round(shortSide * 1/64)` under the text, at height
 * `round(shortSide * 1/12)`.
 * The corner clock uses the frame-counter height, inset from the top and left by
 * `round(shortSide * 1/32)`.
 * The counter, the Bip!/Bop! label, the clock, and the top-right lines use {@link BIP_BOP_FONT_FAMILY}.
 * A 75% sRGB color bar (white, yellow, cyan, green, magenta, red, blue) sits in the
 * bottom-left and stays fixed while the field colors ping-pong. Each swatch is a square
 * of that same height, inset from the left and bottom by that same inset.
 * The arc radius is `round(round(shortSide * 2/5) / 2)`, and the center is
 * `round(width / 2)`, `round(height / 2)`, after width and height are rounded.
 * Padding, text size, coordinates, widths, and heights passed to the canvas are
 * whole pixels.
 * The top-right corner lists `{width}x{height}`. A video also lists `video.mimeType`,
 * `video.videoCodec`, `video.audioCodec`, `video.videoQuality`, and the frame rate
 * as `{fps}FPS` on the following lines. The web preview lists the resolution and,
 * once a 200ms sample of animation frames has been counted, the measured frame
 * rate rounded to a whole number (`{fps}FPS`). Each line is
 * `round(clockFontSize / 2)` tall, inset from the top by the clock's top inset
 * and from the right by the clock's left inset. A still page omits `video` and
 * `sample.previewFps` and draws the resolution only.
 * Image smoothing is off for every canvas and video frame.
 */
export type BipBopSample = FramePicture & {
	/**
	 * Frame rate from the web preview's latest closed 200ms sample.
	 * The web preview draws `round(previewFps)` at the top-right. A video omits this.
	 */
	previewFps?: number;
};

export function BipBopRenderer(
	canvas: BipBopCanvas,
	dimensions: BipBopDimensions,
	sample: BipBopSample,
	video?: BipBopVideoCorner
): void {
	if (dimensions.width <= 0 || dimensions.height <= 0) return;
	const width = wholePixels(dimensions.width);
	const height = wholePixels(dimensions.height);
	if (width <= 0 || height <= 0) return;
	const ctx = prepareContext(canvas, width, height);
	if (!ctx) return;

	const centerX = wholePixels(dimensions.centerX);
	const centerY = wholePixels(dimensions.centerY);
	const radius = wholePixels(dimensions.radius);
	const frameFontSize = wholePixels(dimensions.frameFontSize);
	const frameCountY = wholePixels(dimensions.frameCountY);
	const labelFontSize = wholePixels(dimensions.labelFontSize);
	const labelY = wholePixels(dimensions.labelY);
	const clockFontSize = wholePixels(dimensions.clockFontSize);
	const clockX = wholePixels(dimensions.clockX);
	const clockY = wholePixels(dimensions.clockY);
	const overlayFontSize = wholePixels(dimensions.overlayFontSize);
	const colorBarSize = wholePixels(dimensions.colorBarSize);
	const colorBarX = wholePixels(dimensions.colorBarX);
	const colorBarY = wholePixels(dimensions.colorBarY);
	const frame = sample.frame;
	const marks = pictureMarks(sample);
	const circleMix = marks.bip ? 0 : CYCLE_FRAMES;

	ctx.fillStyle = mixColor(RGB_BLACK, RGB_WHITE, marks.towardMidpoint, CYCLE_FRAMES);
	ctx.fillRect(0, 0, width, height);

	const backing = mixColor(RGB_GRAY, RGB_WHITE, circleMix, CYCLE_FRAMES);
	const sector = mixColor(RGB_WHITE, RGB_GRAY, circleMix, CYCLE_FRAMES);
	fillWedge(ctx, centerX, centerY, radius, 0, marks.startDegrees, backing);
	fillWedge(ctx, centerX, centerY, radius, marks.startDegrees, 360, sector);

	ctx.fillStyle = BLACK;
	ctx.font = monospaceFont(frameFontSize);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(formatFrameCount(frame), centerX, frameCountY);

	if (marks.showLabel) {
		ctx.font = monospaceFont(labelFontSize);
		ctx.textBaseline = 'bottom';
		ctx.fillStyle = mixColor(RGB_BLACK, RGB_WHITE, marks.towardMidpoint, CYCLE_FRAMES);
		ctx.fillText(marks.bip ? BIP_LABEL : BOP_LABEL, centerX, labelY);
	}

	ctx.fillStyle = mixColor(RGB_WHITE, RGB_BLACK, marks.towardMidpoint, CYCLE_FRAMES);
	ctx.font = monospaceFont(clockFontSize);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(formatCentiseconds(marks.clockCentiseconds), clockX, clockY);

	ctx.font = monospaceFont(overlayFontSize);
	ctx.textAlign = 'right';
	const lines = overlayLines(width, height, video, sample.previewFps);
	for (const [index, line] of lines.entries()) {
		ctx.fillText(line, wholePixels(width - clockX), wholePixels(clockY + index * overlayFontSize));
	}

	for (let index = 0; index < COLOR_BAR_75.length; index += 1) {
		ctx.fillStyle = COLOR_BAR_75[index];
		ctx.fillRect(
			wholePixels(colorBarX + index * colorBarSize),
			colorBarY,
			colorBarSize,
			colorBarSize
		);
	}
}

function overlayLines(
	width: number,
	height: number,
	video: BipBopVideoCorner | undefined,
	previewFps: number | undefined
): string[] {
	const resolution = `${width}x${height}`;
	if (video) {
		return [
			resolution,
			video.mimeType,
			video.videoCodec,
			video.audioCodec,
			video.videoQuality,
			formatFpsOverlay(video.fps)
		];
	}
	if (typeof previewFps !== 'number' || !Number.isFinite(previewFps)) return [resolution];
	return [resolution, formatFpsOverlay(Math.round(previewFps))];
}

/** One pie slice of the disk. The two slices share the center and do not overlap. */
function fillWedge(
	ctx: BipBopContext,
	x: number,
	y: number,
	radius: number,
	startDegrees: number,
	endDegrees: number,
	fillStyle: string
): void {
	ctx.beginPath();
	ctx.moveTo(x, y);
	ctx.arc(x, y, radius, radiansFromTop(startDegrees), radiansFromTop(endDegrees));
	ctx.closePath();
	ctx.fillStyle = fillStyle;
	ctx.fill();
}

/** Frame index shown in the circle, at least 6 digits. */
function formatFrameCount(frame: number): string {
	return String(Math.trunc(frame)).padStart(6, '0');
}

type PictureMarks = {
	startDegrees: number;
	towardMidpoint: number;
	showLabel: boolean;
	bip: boolean;
	clockCentiseconds: number;
};

/**
 * Motion for one drawn sample.
 * `cycleFraction / cycleLength` is the fraction of the current second.
 * The caller chooses the beat and whether this sample draws it.
 */
function pictureMarks(sample: BipBopSample): PictureMarks {
	const cycleLength =
		Number.isFinite(sample.cycleLength) && sample.cycleLength > 0 ? sample.cycleLength : 1;
	const cycleFraction =
		Number.isFinite(sample.cycleFraction) && sample.cycleFraction > 0 ? sample.cycleFraction : 0;
	const alongSecond = (cycleFraction * CYCLE_FRAMES) / cycleLength;
	const bip = sample.beat !== 'bop';
	return {
		startDegrees: 1 + (cycleFraction * 360) / cycleLength,
		towardMidpoint: bip ? alongSecond : CYCLE_FRAMES - alongSecond,
		showLabel: sample.showBeat === true,
		bip,
		clockCentiseconds: nonNegativeCentiseconds(sample.clockCentiseconds)
	};
}

function nonNegativeCentiseconds(value: number): number {
	if (!Number.isFinite(value) || value <= 0) return 0;
	return Math.floor(value);
}

/** `HH:MM:SS.CC`. Centiseconds are truncated, not rounded. */
function formatCentiseconds(centisecondsTotal: number): string {
	const centiseconds = centisecondsTotal % 100;
	const secondsTotal = Math.floor(centisecondsTotal / 100);
	const seconds = secondsTotal % 60;
	const minutesTotal = Math.floor(secondsTotal / 60);
	const minutes = minutesTotal % 60;
	const hours = Math.floor(minutesTotal / 60);

	return [
		pad2(hours),
		CLOCK_TIME_SEPARATOR,
		pad2(minutes),
		CLOCK_TIME_SEPARATOR,
		pad2(seconds),
		CLOCK_FRACTION_SEPARATOR,
		pad2(centiseconds)
	].join('');
}

function monospaceFont(size: number): string {
	return `${size}px "${BIP_BOP_FONT_FAMILY}", monospace`;
}

function pad2(value: number): string {
	return String(value).padStart(2, '0');
}

/** Linear mix from `from` at numerator 0 to `to` at numerator === denominator. */
function mixColor(from: Rgb, to: Rgb, numerator: number, denominator: number): string {
	const channel = (start: number, end: number) =>
		Math.round(start + ((end - start) * numerator) / denominator);
	return `#${[channel(from[0], to[0]), channel(from[1], to[1]), channel(from[2], to[2])]
		.map((value) => value.toString(16).padStart(2, '0'))
		.join('')}`;
}

/** Canvas angles start at 3 o'clock; this shifts 0° to 12 o'clock, clockwise. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

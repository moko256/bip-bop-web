export const BIP_BOP_CYCLE_FRAMES = 60;
/** Two-second color loop at 60 fps. Endpoints are one second apart. */
const COLOR_PERIOD_FRAMES = BIP_BOP_CYCLE_FRAMES * 2;

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

/** Digits the frame counter and the elapsed clock can draw. */
const FRAME_COUNT_TEXT = '0123456789';
/** Label above center on even seconds. */
const BIP_LABEL = 'Bip!';
/** Label above center on odd seconds. */
const BOP_LABEL = 'Bop!';
const CLOCK_TIME_SEPARATOR = ':';
const CLOCK_FRACTION_SEPARATOR = '.';

/** Family for every canvas and video label. Subset files live in `$lib/fonts`. */
export const BIP_BOP_FONT_FAMILY = 'JetBrains Mono';

/**
 * Strings whose characters {@link BipBopRenderer} can paint.
 * `scripts/download-jetbrains-mono.mjs` subsets {@link BIP_BOP_FONT_FAMILY} to this list.
 */
export const BIP_BOP_RENDERED_TEXTS = [
	FRAME_COUNT_TEXT,
	BIP_LABEL,
	BOP_LABEL,
	CLOCK_TIME_SEPARATOR,
	CLOCK_FRACTION_SEPARATOR
];

/**
 * Layout shared by the web preview and the video exporter.
 * Every drawn length is `round(shortSide * fraction)` in whole pixels, where
 * `shortSide` is the lesser of the canvas width and height.
 */
export type BipBopDimensions = {
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	/** Backing circle and sector. Diameter is `round(shortSide * 1/3)`. */
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
	/** Side of each 75% color-bar square. Height is `round(shortSide * 1/16)`. */
	colorBarSize: number;
	/** Left inset of the color bar. `round(shortSide * 1/32)`. */
	colorBarX: number;
	/** Top of the color bar. The bottom inset is `round(shortSide * 1/32)`. */
	colorBarY: number;
};

export function createBipBopDimensions(width: number, height: number): BipBopDimensions {
	const shortSide = Math.min(width, height);
	const inset = pixelsAlongShortSide(shortSide, 1, 32);
	const centerGap = pixelsAlongShortSide(shortSide, 1, 64);
	const textHeight = pixelsAlongShortSide(shortSide, 1, 16);
	const diameter = pixelsAlongShortSide(shortSide, 1, 3);
	const centerY = height / 2;

	return {
		width,
		height,
		centerX: width / 2,
		centerY,
		radius: diameter / 2,
		frameFontSize: textHeight,
		frameCountY: centerY + centerGap,
		labelFontSize: pixelsAlongShortSide(shortSide, 1, 12),
		labelY: centerY - centerGap,
		clockFontSize: textHeight,
		clockX: inset,
		clockY: inset,
		colorBarSize: textHeight,
		colorBarX: inset,
		colorBarY: height - inset - textHeight
	};
}

/** `Math.round(shortSide * numerator / denominator)`, in whole pixels. */
function pixelsAlongShortSide(shortSide: number, numerator: number, denominator: number): number {
	return Math.round((shortSide * numerator) / denominator);
}

type BipBopCanvas = HTMLCanvasElement | OffscreenCanvas;
type BipBopContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws one frame. Stateless: the caller owns the frame counter and the canvas size.
 * `dimensions` must match the canvas bitmap (`canvas.width` / `canvas.height`).
 * Angles are degrees clockwise from 12 o'clock.
 * Frame 0 of each 60-frame turn is the sector 1°–360°; each frame moves the start by 6°.
 * Colors ping-pong over 120 frames (2 seconds): field and clock swap black and white,
 * and the sector and backing circle swap white and gray. On each turn boundary the
 * label above center is `Bip!` (black) or `Bop!` (white), alternating every second.
 * The corner clock is elapsed time at 60 fps, truncated to centiseconds (`HH:MM:SS.CC`).
 * The center counter is the frame index, zero-padded to 6 digits. Its top sits
 * `round(shortSide * 1/64)` below center, and its height is `round(shortSide * 1/16)`.
 * `Bip!` / `Bop!` sit above center with `round(shortSide * 1/64)` under the text, at height
 * `round(shortSide * 1/12)`.
 * The corner clock uses the frame-counter height, inset from the top and left by
 * `round(shortSide * 1/32)`.
 * The counter, the Bip!/Bop! label, and the clock use {@link BIP_BOP_FONT_FAMILY}.
 * A 75% sRGB color bar (white, yellow, cyan, green, magenta, red, blue) sits in the
 * bottom-left and stays fixed while the field colors ping-pong. Each swatch is a square
 * of that same height, inset from the left and bottom by that same inset.
 * The circle diameter is `round(shortSide * 1/3)`.
 * Image smoothing is off for every canvas and video frame.
 */
export function BipBopRenderer(
	canvas: BipBopCanvas,
	dimensions: BipBopDimensions,
	frame: number
): void {
	const ctx = canvas.getContext('2d', { alpha: false }) as BipBopContext | null;
	if (!ctx || dimensions.width <= 0 || dimensions.height <= 0) return;

	const {
		width,
		height,
		centerX,
		centerY,
		radius,
		frameFontSize,
		frameCountY,
		labelFontSize,
		labelY,
		clockFontSize,
		clockX,
		clockY,
		colorBarSize,
		colorBarX,
		colorBarY
	} = dimensions;
	const cycleFrame = nonNegativeMod(frame, BIP_BOP_CYCLE_FRAMES);
	const periodFrame = nonNegativeMod(frame, COLOR_PERIOD_FRAMES);
	const startDegrees = 1 + cycleFrame * (360 / BIP_BOP_CYCLE_FRAMES);
	const towardMidpoint =
		periodFrame <= BIP_BOP_CYCLE_FRAMES ? periodFrame : COLOR_PERIOD_FRAMES - periodFrame;

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	// Page canvas and video frames share this draw. Anti-aliasing stays off.
	ctx.imageSmoothingEnabled = false;

	ctx.fillStyle = mixColor(RGB_BLACK, RGB_WHITE, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
	ctx.fillRect(0, 0, width, height);

	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.fillStyle = mixColor(RGB_GRAY, RGB_WHITE, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(centerX, centerY);
	ctx.arc(centerX, centerY, radius, radiansFromTop(startDegrees), radiansFromTop(360));
	ctx.closePath();
	ctx.fillStyle = mixColor(RGB_WHITE, RGB_GRAY, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
	ctx.fill();

	ctx.fillStyle = BLACK;
	ctx.font = monospaceFont(frameFontSize);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(formatFrameCount(frame), centerX, frameCountY);

	if (cycleFrame === 0) {
		ctx.font = monospaceFont(labelFontSize);
		ctx.textBaseline = 'bottom';
		ctx.fillStyle = mixColor(RGB_BLACK, RGB_WHITE, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
		ctx.fillText(periodFrame === 0 ? BIP_LABEL : BOP_LABEL, centerX, labelY);
	}

	ctx.fillStyle = mixColor(RGB_WHITE, RGB_BLACK, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
	ctx.font = monospaceFont(clockFontSize);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'top';
	ctx.fillText(formatElapsedClock(frame), clockX, clockY);

	for (let index = 0; index < COLOR_BAR_75.length; index += 1) {
		ctx.fillStyle = COLOR_BAR_75[index];
		ctx.fillRect(colorBarX + index * colorBarSize, colorBarY, colorBarSize, colorBarSize);
	}
}

/** Frame index shown in the circle, at least 6 digits. */
function formatFrameCount(frame: number): string {
	return String(Math.trunc(frame)).padStart(6, '0');
}

/** `HH:MM:SS.CC` from a 60 fps frame index. Centiseconds are truncated, not rounded. */
function formatElapsedClock(frame: number): string {
	const centisecondsTotal = Math.floor((Math.trunc(frame) * 100) / BIP_BOP_CYCLE_FRAMES);
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

function nonNegativeMod(value: number, modulus: number): number {
	return ((value % modulus) + modulus) % modulus;
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

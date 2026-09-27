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

/** Layout shared by the web preview and a future video exporter. */
export type BipBopDimensions = {
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	/** Backing circle and sector. Diameter is one third of the canvas height. */
	radius: number;
	fontSize: number;
	/** Elapsed clock burned into the top-left corner. */
	clockFontSize: number;
	clockX: number;
	clockY: number;
	/** Side of each bottom-left 75% color-bar square: 1/32 of the short side, rounded to a whole pixel. */
	colorBarSize: number;
	/** Left edge of the color bar. */
	colorBarX: number;
	/** Top edge of the color bar. The row sits on the bottom edge. */
	colorBarY: number;
};

export function createBipBopDimensions(width: number, height: number): BipBopDimensions {
	const colorBarSize = Math.round(Math.min(width, height) / 32);

	return {
		width,
		height,
		centerX: width / 2,
		centerY: height / 2,
		radius: height / 6,
		fontSize: height / 12,
		clockFontSize: height / 24,
		clockX: height / 36,
		clockY: height / 36,
		colorBarSize,
		colorBarX: 0,
		colorBarY: height - colorBarSize
	};
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
 * The center counter is the frame index, zero-padded to 6 digits.
 * A 75% sRGB color bar (white, yellow, cyan, green, magenta, red, blue) sits in the
 * bottom-left and stays fixed while the field colors ping-pong. Each swatch is a square
 * whose side is 1/32 of the short side, rounded to a whole pixel.
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
		fontSize,
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
	ctx.font = `${fontSize}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(formatFrameCount(frame), centerX, centerY);

	if (cycleFrame === 0) {
		ctx.textBaseline = 'bottom';
		ctx.fillStyle = mixColor(RGB_BLACK, RGB_WHITE, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
		ctx.fillText(periodFrame === 0 ? 'Bip!' : 'Bop!', centerX, centerY);
	}

	ctx.fillStyle = mixColor(RGB_WHITE, RGB_BLACK, towardMidpoint, BIP_BOP_CYCLE_FRAMES);
	ctx.font = `${clockFontSize}px monospace`;
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

	return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}.${pad2(centiseconds)}`;
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

export const BIP_BOP_CYCLE_FRAMES = 60;

const BACKGROUND = '#000000';
const CIRCLE = '#808080';
const SECTOR = '#ffffff';
const TEXT = '#000000';
const CLOCK = '#ffffff';

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
	/** Side of each bottom-left 75% color-bar square: 1/32 of the short side. */
	colorBarSize: number;
	/** Left edge of the color bar. */
	colorBarX: number;
	/** Top edge of the color bar. The row sits on the bottom edge. */
	colorBarY: number;
};

export function createBipBopDimensions(width: number, height: number): BipBopDimensions {
	const colorBarSize = Math.min(width, height) / 32;

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
 * The corner clock is elapsed time at 60 fps, truncated to centiseconds (`HH:MM:SS.CC`).
 * The center counter is the frame index, zero-padded to 6 digits.
 * A 75% sRGB color bar (white, yellow, cyan, green, magenta, red, blue) sits in the
 * bottom-left. Each swatch is a square whose side is 1/32 of the short side.
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
	const cycleFrame = ((frame % BIP_BOP_CYCLE_FRAMES) + BIP_BOP_CYCLE_FRAMES) % BIP_BOP_CYCLE_FRAMES;
	const startDegrees = 1 + cycleFrame * (360 / BIP_BOP_CYCLE_FRAMES);

	ctx.setTransform(1, 0, 0, 1, 0, 0);

	ctx.fillStyle = BACKGROUND;
	ctx.fillRect(0, 0, width, height);

	ctx.beginPath();
	ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
	ctx.fillStyle = CIRCLE;
	ctx.fill();

	ctx.beginPath();
	ctx.moveTo(centerX, centerY);
	ctx.arc(centerX, centerY, radius, radiansFromTop(startDegrees), radiansFromTop(360));
	ctx.closePath();
	ctx.fillStyle = SECTOR;
	ctx.fill();

	ctx.fillStyle = TEXT;
	ctx.font = `${fontSize}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillText(formatFrameCount(frame), centerX, centerY);

	if (cycleFrame === 0) {
		ctx.textBaseline = 'bottom';
		ctx.fillText('Bip!', centerX, centerY);
	}

	ctx.fillStyle = CLOCK;
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

/** Canvas angles start at 3 o'clock; this shifts 0° to 12 o'clock, clockwise. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

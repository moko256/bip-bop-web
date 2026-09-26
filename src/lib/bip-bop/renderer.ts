export const BIP_BOP_CYCLE_FRAMES = 60;

const BACKGROUND = '#000000';
const CIRCLE = '#808080';
const SECTOR = '#ffffff';
const TEXT = '#000000';

/** Layout shared by the web preview and a future video exporter. */
export type BipBopDimensions = {
	width: number;
	height: number;
	centerX: number;
	centerY: number;
	/** Backing circle and sector. Diameter is one third of the canvas height. */
	radius: number;
	fontSize: number;
};

export function createBipBopDimensions(width: number, height: number): BipBopDimensions {
	return {
		width,
		height,
		centerX: width / 2,
		centerY: height / 2,
		radius: height / 6,
		fontSize: height / 12
	};
}

type BipBopCanvas = HTMLCanvasElement | OffscreenCanvas;
type BipBopContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/**
 * Draws one frame. Stateless: the caller owns the frame counter and the canvas size.
 * `dimensions` must match the canvas bitmap (`canvas.width` / `canvas.height`).
 * Angles are degrees clockwise from 12 o'clock.
 * Frame 0 of each 60-frame turn is the sector 1°–360°; each frame moves the start by 6°.
 */
export function BipBopRenderer(
	canvas: BipBopCanvas,
	dimensions: BipBopDimensions,
	frame: number
): void {
	const ctx = canvas.getContext('2d', { alpha: false }) as BipBopContext | null;
	if (!ctx || dimensions.width <= 0 || dimensions.height <= 0) return;

	const { width, height, centerX, centerY, radius, fontSize } = dimensions;
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
	ctx.fillText(String(frame), centerX, centerY);

	if (cycleFrame === 0) {
		ctx.textBaseline = 'bottom';
		ctx.fillText('Bip!', centerX, centerY);
	}
}

/** Canvas angles start at 3 o'clock; this shifts 0° to 12 o'clock, clockwise. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

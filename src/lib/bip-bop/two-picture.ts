import Two from 'two.js';
import type { Picture } from './picture';

export type BipBopCanvas = HTMLCanvasElement | OffscreenCanvas;

type Session = {
	two: Two;
	domElement: OffscreenCanvas;
	width: number;
	height: number;
};

const sessions = new WeakMap<BipBopCanvas, Session>();

/**
 * One WebGL Two.js instance per canvas. The OffscreenCanvas bitmap, `width`,
 * and `height` are set before that instance is passed to `Two.WebGLRenderer`.
 * A later frame of the same size reuses the instance.
 */
export function sizedTwo(canvas: BipBopCanvas, width: number, height: number): Two {
	const existing = sessions.get(canvas);
	if (existing && existing.width === width && existing.height === height) return existing.two;
	if (existing) release(existing, canvas);

	const domElement =
		canvas instanceof OffscreenCanvas ? canvas : new OffscreenCanvas(width, height);
	domElement.width = width;
	domElement.height = height;

	// Two's published constructor types omit WebGL `antialias` and `OffscreenCanvas`.
	// The instance already carries width, height, and the sized bitmap when Two
	// passes it to `Two.WebGLRenderer`.
	const two = new Two({
		type: Two.Types.webgl,
		width,
		height,
		ratio: 1,
		autostart: false,
		antialias: false,
		domElement
	} as unknown as NonNullable<ConstructorParameters<typeof Two>[0]>);
	sessions.set(canvas, { two, domElement, width, height });
	return two;
}

/** Picture commands for a Two.js instance whose size is already set. */
export function pictureFor(two: Two): Picture {
	return {
		fillRect(x, y, width, height, fill) {
			const shape = two.makeRectangle(x + width / 2, y + height / 2, width, height);
			shape.noStroke();
			shape.fill = fill;
		},
		fillCircle(x, y, radius, fill) {
			const shape = two.makeCircle(x, y, radius);
			shape.noStroke();
			shape.fill = fill;
		},
		fillSector(x, y, radius, startDegrees, endDegrees, fill) {
			const shape = two.makeArcSegment(
				x,
				y,
				0,
				radius,
				radiansFromTop(startDegrees),
				radiansFromTop(endDegrees)
			);
			shape.noStroke();
			shape.fill = fill;
		},
		fillText(text, x, y, style) {
			const shape = two.makeText(text, x, y, {
				family: style.family,
				size: style.size,
				leading: style.size,
				alignment: style.align,
				baseline: style.baseline,
				fill: style.fill,
				weight: 400,
				style: 'normal'
			});
			shape.noStroke();
		}
	};
}

/** Copy a WebGL OffscreenCanvas onto the HTML canvas the page shows. */
export function present(canvas: BipBopCanvas, two: Two): void {
	const source = two.renderer.domElement;
	if (canvas === source || !(canvas instanceof HTMLCanvasElement)) return;
	const ctx = canvas.getContext('2d', { alpha: false });
	if (!ctx) return;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(source, 0, 0);
}

function release(session: Session, canvas: BipBopCanvas): void {
	const index = Two.Instances.indexOf(session.two);
	if (index >= 0) Two.Instances.splice(index, 1);
	if (session.domElement === canvas) return;
	webglContext(session.two)?.getExtension('WEBGL_lose_context')?.loseContext();
}

function webglContext(two: Two): WebGLRenderingContext | null {
	if (two.type !== Two.Types.webgl) return null;
	const ctx = (two.renderer as { ctx?: WebGLRenderingContext }).ctx;
	return ctx ?? null;
}

/** Two.js angles start at 3 o'clock; this shifts 0° to 12 o'clock, clockwise. */
function radiansFromTop(degrees: number): number {
	return -Math.PI / 2 + (degrees * Math.PI) / 180;
}

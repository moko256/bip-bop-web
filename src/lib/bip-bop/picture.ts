/** Horizontal anchor of a label. */
export type PictureAlign = 'left' | 'center' | 'right';

/** Vertical anchor of a label. */
export type PictureBaseline = 'top' | 'bottom';

export type PictureText = {
	size: number;
	/** CSS `font-family` stack. */
	family: string;
	align: PictureAlign;
	baseline: PictureBaseline;
	fill: string;
};

/**
 * Marks one Bip/Bop frame paints. Tests record these calls. The page and the
 * video satisfy the same interface with Two.js.
 * A sector runs clockwise from 12 o'clock. `endDegrees` of 360 is one full
 * turn past 0, so a start of 1° and an end of 360° leaves a 1° gap.
 */
export type Picture = {
	fillRect(x: number, y: number, width: number, height: number, fill: string): void;
	fillCircle(x: number, y: number, radius: number, fill: string): void;
	fillSector(
		x: number,
		y: number,
		radius: number,
		startDegrees: number,
		endDegrees: number,
		fill: string
	): void;
	fillText(text: string, x: number, y: number, style: PictureText): void;
};

const BACKGROUND_VAR = '--pico-background-color';

/** Normalize a CSS color for `<meta name="theme-color">`. */
export function normalizeThemeColor(value: string): string {
	const trimmed = value.trim();
	if (trimmed.startsWith('#')) {
		return expandHex(trimmed);
	}

	const rgbMatch = /^rgba?\(\s*([^)]+)\s*\)$/i.exec(trimmed);
	if (rgbMatch) {
		const parts = rgbMatch[1].split(/\s*,\s*/);
		if (parts.length < 3) throw new Error(`Unsupported color: ${trimmed}`);
		const channels = parts.slice(0, 3).map(parseRgbChannel);
		return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
	}

	throw new Error(`Unsupported color: ${trimmed}`);
}

function expandHex(hex: string): string {
	const body = hex.slice(1);
	if (body.length === 3) {
		return `#${body
			.split('')
			.map((digit) => digit + digit)
			.join('')}`;
	}
	if (body.length === 6) return `#${body.toLowerCase()}`;
	throw new Error(`Unsupported hex color: ${hex}`);
}

function parseRgbChannel(raw: string): number {
	const value = raw.trim();
	if (value.endsWith('%')) {
		const percent = Number.parseFloat(value);
		return Math.round((percent / 100) * 255);
	}
	return Math.round(Number.parseFloat(value));
}

function isPageBackground(value: string): boolean {
	const trimmed = value.trim();
	return trimmed.length > 0 && !trimmed.startsWith('var(') && trimmed !== 'transparent' && trimmed !== '#0000';
}

/** Read light/dark page backgrounds from compiled Pico CSS (after Sass and Lightning CSS). */
export function extractPicoThemeColors(css: string): { light: string; dark: string } {
	const assignments = [...css.matchAll(new RegExp(`${BACKGROUND_VAR}:\\s*([^;}{]+)`, 'g'))]
		.map((match) => match[1].trim())
		.filter(isPageBackground);

	if (assignments.length < 2) {
		throw new Error(`Expected light and dark ${BACKGROUND_VAR} values in Pico CSS`);
	}

	return {
		light: normalizeThemeColor(assignments[0]),
		dark: normalizeThemeColor(assignments[1])
	};
}

import { describe, expect, it } from 'vitest';
import { loadBipBopFont } from './font';

describe('loadBipBopFont', () => {
	it('loads the local JetBrains Mono face', async () => {
		await loadBipBopFont();

		const faces = [...document.fonts].filter(
			(face) => face.family.replaceAll('"', '') === 'JetBrains Mono'
		);
		expect(faces.length).toBeGreaterThan(0);
		expect(faces.every((face) => face.status === 'loaded')).toBe(true);
	});
});
import * as m from '$lib/paraglide/messages';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import NoScript from './NoScript.svelte';

describe('NoScript', () => {
	it('tells a visitor without JavaScript to enable it', () => {
		const { body } = render(NoScript);

		expect(body).toContain('<noscript>');
		expect(body).toContain(m.noscript_description());
	});
});

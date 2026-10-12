import type { Snippet } from 'svelte';

/**
 * OutputControls places the title and the OutputType switch around these regions.
 * `settings` is everything under the switch.
 */
export type OutputLayoutPlace = Snippet<[media: Snippet, settings: Snippet]>;

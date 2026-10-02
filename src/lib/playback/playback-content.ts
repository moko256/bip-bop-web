import type { Snippet } from 'svelte';

export type PlaybackContentProps = {
	onclick: () => void;
};

export type PlaybackContent = Snippet<[PlaybackContentProps]>;

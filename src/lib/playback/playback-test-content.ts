import { createRawSnippet } from 'svelte';
import type { PlaybackContentProps } from './playback-content';

export const playbackTestContent = createRawSnippet((getProps: () => PlaybackContentProps) => ({
	render: () => '<div data-testid="content" style="width:100%;height:120px">picture</div>',
	setup: (element) => {
		const click = () => getProps().onclick();
		element.addEventListener('click', click);
		return () => element.removeEventListener('click', click);
	}
}));

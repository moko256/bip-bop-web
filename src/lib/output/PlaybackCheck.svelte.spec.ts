import { describe, expect, it } from 'vitest';
import { PlaybackCheck } from './PlaybackCheck.svelte';
import type { PlaybackSelection } from './playback-support';

const selection: PlaybackSelection = {
	videoCodec: 'avc',
	audioCodec: 'aac',
	videoQuality: 'high'
};

function deferred<T>() {
	let resolve: (value: T) => void = () => {};
	let reject: (error: unknown) => void = () => {};
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

describe('PlaybackCheck', () => {
	it('keeps the selection playable while the check is in flight', async () => {
		const pending = deferred<boolean>();
		const check = new PlaybackCheck(() => pending.promise);

		const loading = check.load(selection);

		expect(check.checking).toBe(true);
		expect(check.playable).toBe(true);

		pending.resolve(false);
		await loading;

		expect(check.checking).toBe(false);
		expect(check.playable).toBe(false);
	});

	it('marks a playable selection once the check succeeds', async () => {
		const check = new PlaybackCheck(() => Promise.resolve(true));

		await check.load(selection);

		expect(check.checking).toBe(false);
		expect(check.playable).toBe(true);
	});

	it('enables the next check after an unplayable result and ignores the stale one', async () => {
		const first = deferred<boolean>();
		const second = deferred<boolean>();
		const selections: PlaybackSelection[] = [];
		const check = new PlaybackCheck((next) => {
			selections.push(next);
			return selections.length === 1 ? first.promise : second.promise;
		});

		const firstLoad = check.load(selection);
		const next = { ...selection, videoQuality: 'low' as const };
		const secondLoad = check.load(next);

		expect(check.checking).toBe(true);
		expect(check.playable).toBe(true);

		first.resolve(false);
		await firstLoad;

		expect(check.checking).toBe(true);
		expect(check.playable).toBe(true);

		second.resolve(false);
		await secondLoad;

		expect(check.checking).toBe(false);
		expect(check.playable).toBe(false);
		expect(selections[1]).toEqual(next);
	});

	it('treats a failed check as not playable', async () => {
		const check = new PlaybackCheck(() => Promise.reject(new Error('decoder missing')));

		await check.load(selection);

		expect(check.checking).toBe(false);
		expect(check.playable).toBe(false);
	});

	it('ignores a result that arrives after dispose', async () => {
		const pending = deferred<boolean>();
		const check = new PlaybackCheck(() => pending.promise);
		const loading = check.load(selection);

		check.dispose();
		pending.resolve(false);
		await loading;

		expect(check.playable).toBe(true);
		expect(check.checking).toBe(true);
	});
});

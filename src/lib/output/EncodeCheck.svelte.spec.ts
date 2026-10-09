import { describe, expect, it } from 'vitest';
import { EncodeCheck } from './EncodeCheck.svelte';
import type { EncodeSelection } from './encode-support';

const selection: EncodeSelection = {
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

describe('EncodeCheck', () => {
	it('keeps the selection encodable while the check is in flight', async () => {
		const pending = deferred<boolean>();
		const check = new EncodeCheck(() => pending.promise);

		const loading = check.load(selection);

		expect(check.checking).toBe(true);
		expect(check.encodable).toBe(true);

		pending.resolve(false);
		await loading;

		expect(check.checking).toBe(false);
		expect(check.encodable).toBe(false);
	});

	it('marks an encodable selection once the check succeeds', async () => {
		const check = new EncodeCheck(() => Promise.resolve(true));

		await check.load(selection);

		expect(check.checking).toBe(false);
		expect(check.encodable).toBe(true);
	});

	it('enables the next check after an unencodable result and ignores the stale one', async () => {
		const first = deferred<boolean>();
		const second = deferred<boolean>();
		const selections: EncodeSelection[] = [];
		const check = new EncodeCheck((next) => {
			selections.push(next);
			return selections.length === 1 ? first.promise : second.promise;
		});

		const firstLoad = check.load(selection);
		const next = { ...selection, videoQuality: 'low' as const };
		const secondLoad = check.load(next);

		expect(check.checking).toBe(true);
		expect(check.encodable).toBe(true);

		first.resolve(false);
		await firstLoad;

		expect(check.checking).toBe(true);
		expect(check.encodable).toBe(true);

		second.resolve(false);
		await secondLoad;

		expect(check.checking).toBe(false);
		expect(check.encodable).toBe(false);
		expect(selections[1]).toEqual(next);
	});

	it('treats a failed check as not encodable', async () => {
		const check = new EncodeCheck(() => Promise.reject(new Error('encoder missing')));

		await check.load(selection);

		expect(check.checking).toBe(false);
		expect(check.encodable).toBe(false);
	});

	it('ignores a result that arrives after dispose', async () => {
		const pending = deferred<boolean>();
		const check = new EncodeCheck(() => pending.promise);
		const loading = check.load(selection);

		check.dispose();
		pending.resolve(false);
		await loading;

		expect(check.encodable).toBe(true);
		expect(check.checking).toBe(true);
	});
});

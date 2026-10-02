import { describe, expect, it } from 'vitest';
import { scheduleLiveTones, type ToneClock } from './tone-schedule';

type StartedTone = {
	frequencyHz: number;
	start: number;
	stop: number;
};

class FakeAudioContext {
	state: AudioContextState = 'running';
	currentTime = 0;
	outputLatency = 0;
	destination = {} as AudioDestinationNode;
	tones: StartedTone[] = [];

	createOscillator(): OscillatorNode {
		const tone: StartedTone = { frequencyHz: 0, start: 0, stop: 0 };
		this.tones.push(tone);
		return {
			type: 'sine',
			frequency: {
				set value(next: number) {
					tone.frequencyHz = next;
				},
				get value() {
					return tone.frequencyHz;
				}
			},
			connect: () => undefined,
			disconnect: () => undefined,
			addEventListener: () => undefined,
			start: (when = 0) => {
				tone.start = when;
			},
			stop: (when = 0) => {
				tone.stop = when;
			}
		} as unknown as OscillatorNode;
	}
}

function manualClock() {
	let now = 0;
	let nextId = 1;
	const delays = new Map<number, { at: number; callback: () => void }>();
	const clock: ToneClock = {
		delay(ms, callback) {
			const id = nextId++;
			delays.set(id, { at: now + ms, callback });
			return id;
		},
		cancelDelay(id) {
			delays.delete(id);
		}
	};
	return {
		clock,
		advance(ms: number) {
			now += ms;
			const due = [...delays.entries()].filter(([, timer]) => timer.at <= now);
			for (const [id, timer] of due) {
				delays.delete(id);
				timer.callback();
			}
		}
	};
}

describe('scheduleLiveTones', () => {
	it('plays Bip immediately and Bop on the next second', () => {
		const time = manualClock();
		const context = new FakeAudioContext();
		let elapsed = 0;
		scheduleLiveTones({
			context: context as unknown as AudioContext,
			elapsedMs: 0,
			getElapsed: () => elapsed,
			clock: time.clock,
			active: () => true
		});

		const opening = context.tones[0];
		expect(opening?.frequencyHz).toBe(1500);
		expect(opening?.start).toBeCloseTo(0);
		expect((opening?.stop ?? 0) - (opening?.start ?? 0)).toBeCloseTo(0.016);

		elapsed = 16;
		time.advance(16);

		const next = context.tones[1];
		expect(next?.frequencyHz).toBe(475);
		expect(next?.start).toBeCloseTo(0.984);
		expect((next?.stop ?? 0) - (next?.start ?? 0)).toBeCloseTo(0.016);
	});

	it('schedules the following even second when the clock is already past a burst', () => {
		const context = new FakeAudioContext();
		scheduleLiveTones({
			context: context as unknown as AudioContext,
			elapsedMs: 1016,
			getElapsed: () => 1016,
			clock: manualClock().clock,
			active: () => true
		});

		expect(context.tones[0]?.frequencyHz).toBe(1500);
		expect(context.tones[0]?.start).toBeCloseTo(0.984);
	});

	it('plays the opening burst one outputLatency ahead and holds the next wait', () => {
		const time = manualClock();
		const context = new FakeAudioContext();
		context.outputLatency = 0.04;
		let elapsed = 0;
		const stop = scheduleLiveTones({
			context: context as unknown as AudioContext,
			elapsedMs: 0,
			getElapsed: () => elapsed,
			clock: time.clock,
			active: () => true
		});

		expect(stop.pictureShiftMs).toBe(80);
		expect(context.tones[0]?.frequencyHz).toBe(1500);
		expect(context.tones[0]?.start).toBeCloseTo(0.04);

		elapsed = 16;
		time.advance(16);
		expect(context.tones).toHaveLength(1);

		elapsed = 96;
		time.advance(80);
		expect(context.tones[1]?.frequencyHz).toBe(475);
		expect(context.tones[1]?.start).toBeCloseTo(0.944);
	});

	it('cancels the wait for the next burst', () => {
		const time = manualClock();
		const context = new FakeAudioContext();
		const stop = scheduleLiveTones({
			context: context as unknown as AudioContext,
			elapsedMs: 0,
			getElapsed: () => 16,
			clock: time.clock,
			active: () => true
		});

		stop();
		time.advance(16);

		expect(context.tones).toHaveLength(1);
	});
});

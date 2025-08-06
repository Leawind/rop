import { describe, expect, test } from 'bun:test';
import { Rop } from '../src';

describe('Rop Test', () => {
	test('basic', () => {
		const rop = new Rop().bind({ a: 1, b: 2 });
		expect(rop.o<number>`a + b`).toBe(3);
	});

	test('bind method with key-value pair', () => {
		const rop = new Rop().bind('a', 1);
		expect(rop.bindings.get('a')).toBe(1);

		rop.bind('b', 'test');
		expect(rop.bindings.get('b')).toBe('test');
	});

	test('bind method chaining', () => {
		const rop = new Rop()
			.bind('a', 1)
			.bind({ b: 2 })
			.bind(new Map([['c', 3]]));

		expect(rop.bindings.size).toBe(3);
		expect(rop.bindings.get('a')).toBe(1);
		expect(rop.bindings.get('b')).toBe(2);
		expect(rop.bindings.get('c')).toBe(3);
	});

	test('unbind method', () => {
		const rop = new Rop().bind({ a: 1, b: 2, c: 3 });
		expect(rop.bindings.size).toBe(3);

		rop.unbind('b');
		expect(rop.bindings.size).toBe(2);
		expect(rop.bindings.has('a')).toBe(true);
		expect(rop.bindings.has('b')).toBe(false);
		expect(rop.bindings.has('c')).toBe(true);

		rop.unbind('a', 'c');
		expect(rop.bindings.size).toBe(0);
	});

	test('o template tag', () => {
		const rop = new Rop().bind({ a: 10, b: 5 });
		expect(rop.o<number>`a + b`).toBe(15);
		expect(rop.o<number>`a - b`).toBe(5);
		expect(rop.o<number>`a * b`).toBe(50);
		expect(rop.o<boolean>`a > b`).toBe(true);
	});
});

describe('Rop builtin test', () => {
	test('bindBuiltins', () => {
		const rop = new Rop().bindDefaults().bindMaths();
		expect(rop.o<boolean>`true`).toBe(true);
		expect(rop.o<boolean>`false`).toBe(false);
		expect(rop.o<any>`null`).toBe(null);
		expect(rop.o<any>`undefined`).toBe(undefined);
		expect(rop.o<number>`Infinity`).toBe(Infinity);
		expect(rop.o<number>`-Infinity`).toBe(-Infinity);
		expect(rop.o<number>`NaN`).toBe(NaN);

		expect(rop.o<number>`sin(PI / 2)`).toBe(1);
	});

	test('overloadBuiltins', () => {
		const rop = new Rop().overloadDefaults();
		expect(rop.o<number[]>`${[3, 4]} + ${[5, 6]}`).toEqual([3, 4, 5, 6]);
		expect(rop.o<string>`'a' * 3`).toBe('aaa');
		expect(rop.o<string>`3 * 'b'`).toBe('bbb');
		expect(rop.o<Set<number>>`${new Set([5, 6, 7])} + ${new Set([1, 2, 3])}`).toEqual(new Set([1, 2, 3, 5, 6, 7]));
	});

	describe('Array slicing', () => {
		const rop = new Rop().overloadDefaults();
		rop.bind({ arr: [1, 2, 3, 4, 5, 6, 7, 8] });

		test('should throw when step is 0', () => {
			expect(() => rop.o`arr[::0]`).toThrow();
		});

		test('should get whole array', () => {
			expect(rop.o<number[]>`arr[:]`).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
			expect(rop.o<number[]>`arr[::]`).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
			expect(rop.o<number[]>`arr[::1]`).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		});

		test('should slice positive step', () => {
			expect(rop.o<number[]>`arr[2:7]`).toEqual([3, 4, 5, 6, 7]);
			expect(rop.o<number[]>`arr[2:7:1]`).toEqual([3, 4, 5, 6, 7]);
			expect(rop.o<number[]>`arr[2:8:2]`).toEqual([3, 5, 7]);
			expect(rop.o<number[]>`arr[2:8:2]`).toEqual([3, 5, 7]);

			expect(rop.o<number[]>`arr[1:-2:2]`).toEqual([2, 4, 6]);
			expect(rop.o<number[]>`arr[-2:]`).toEqual([7, 8]);
		});

		test('should slice negative step', () => {
			expect(rop.o<number[]>`arr[::-1]`).toEqual([8, 7, 6, 5, 4, 3, 2, 1]);

			expect(rop.o<number[]>`arr[5::-1]`).toEqual([6, 5, 4, 3, 2, 1]);
			expect(rop.o<number[]>`arr[-2::-1]`).toEqual([7, 6, 5, 4, 3, 2, 1]);
			expect(rop.o<number[]>`arr[-2::-2]`).toEqual([7, 5, 3, 1]);

			expect(rop.o<number[]>`arr[:2:-1]`).toEqual([8, 7, 6, 5, 4]);
			expect(rop.o<number[]>`arr[:-1:-1]`).toEqual([]);
			expect(rop.o<number[]>`arr[:-4:-1]`).toEqual([8, 7, 6]);

			expect(rop.o<number[]>`arr[6:2:-1]`).toEqual([7, 6, 5, 4]);
			expect(rop.o<number[]>`arr[-2:3:-1]`).toEqual([7, 6, 5]);
		});
	});
});

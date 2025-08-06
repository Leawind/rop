import { describe, expect, test } from 'bun:test';
import { $eval } from '../test-utils.test';
import { Rop } from '../../src/Rop';

describe('Evaluater', () => {
	test('should evaluate constant values', () => {
		expect($eval`42`).toBe(42);
		expect($eval`299792458n`).toBe(299792458n);
		expect($eval`3.14`).toBe(3.14);
		expect($eval`31415e-4`).toBe(31415e-4);
		expect($eval`"hello"`).toBe('hello');
		expect($eval`'world'`).toBe('world');
	});

	test('should evaluate interpolated values', () => {
		expect($eval`'Hello, ' + ${'world'} + '!'`).toBe('Hello, world!');
		expect($eval`${Math}.sin(${Math}.PI / 2)`).toBe(1);
	});

	test('should evaluate unary operators', () => {
		expect($eval`!true`).toBe(false);
		expect($eval`!false`).toBe(true);
		expect($eval`~-1`).toBe(0);
		expect($eval`-5`).toBe(-5);
		expect($eval`+10`).toBe(10);
	});

	test('should evaluate binary operators', () => {
		expect($eval`1 + 2`).toBe(3);
		expect($eval`5 - 3`).toBe(2);
		expect($eval`4 * 3`).toBe(12);
		expect($eval`10 / 2`).toBe(5);
		expect($eval`10 % 3`).toBe(1);
		expect($eval`2 ** 3`).toBe(8);
		expect($eval`5 > 3`).toBe(true);
		expect($eval`5 < 3`).toBe(false);
		expect($eval`5 >= 5`).toBe(true);
		expect($eval`5 <= 3`).toBe(false);
		expect($eval`5 == 5`).toBe(true);
		expect($eval`5 != 3`).toBe(true);
		expect($eval`5 === 5`).toBe(true);
		expect($eval`5 !== 3`).toBe(true);
		expect($eval`true && true`).toBe(true);
		expect($eval`true && false`).toBe(false);
		expect($eval`false || true`).toBe(true);
		expect($eval`false || false`).toBe(false);
	});

	test('should evaluate operator precedence', () => {
		expect($eval`1 + 2 * 3`).toBe(7);
		expect($eval`(1 + 2) * 3`).toBe(9);
		// Right associative
		expect($eval`2 ** 3 ** 2`).toBe(512);
		expect($eval`2 ** (3 ** 2)`).toBe(512);
		expect($eval`(2 ** 3) ** 2`).toBe(64);
	});

	test('should evaluate function calls', () => {
		expect($eval`${() => 3}()`).toBe(3);
		expect($eval`min(1, 2)`).toBe(1);
		expect($eval`max(1, 2, 3)`).toBe(3);
	});

	test('should evaluate array indexing', () => {
		const arr = [10, 20, 30];

		expect($eval`${arr}[0]`).toBe(10);
		expect($eval`${arr}[1]`).toBe(20);
		expect($eval`${arr}[-1]`).toBe(30);

		const obj = { key: 'value' };
		expect($eval`${obj}["key"]`).toBe('value');
	});

	test('should evaluate object property access', () => {
		const obj = { key: 'value' };
		expect($eval`${obj}.key`).toBe('value');
	});
});

describe('Evaluater: search for binary operator overload', () => {
	test('should find the overload', () => {
		const rop = new Rop();

		rop.overload(String, '*', (self: string, other: number) => self.repeat(other));

		expect(rop.o<string>`'hey' * 3`).toBe('heyheyhey');
		expect(rop.o<string>`3 * 'hey'`).toBe('heyheyhey');
	});
});

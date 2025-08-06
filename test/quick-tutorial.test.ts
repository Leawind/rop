import { describe, expect, test } from 'bun:test';
import { Rop, o } from '../src';

/**
 * Quick Tutorial for rop - Runtime Operator Parsing
 *
 * This tutorial demonstrates the core concepts and basic usage of rop.
 *
 * rop is a TypeScript/JavaScript library for parsing and evaluating expressions
 * using tagged template literals. It supports operator overloading for custom
 * and built-in types, enabling custom behaviors for JS operators.
 */
describe('Quick Tutorial: Basic Usage', () => {
	/**
	 * Basic Usage
	 *
	 * The simplest way to use rop is with the default instance `Rop.INST`
	 *
	 * `o` is a quick alias for `Rop.INST.o`.
	 */
	test('Basic expression evaluation', () => {
		// Simple arithmetic
		expect(o`2 + 3` === 5).toBeTrue();
		expect(o`15 / 3` === 5).toBeTrue();

		// Operator precedence
		expect(o`2 + 3 * 4` === 14).toBeTrue(); // 2 + (3 * 4)
		expect(o`(2 + 3) * 4` === 20).toBeTrue(); // (2 + 3) * 4

		// Comparison operators
		expect(o`5 > 3`).toBeTrue();
		expect(o`2 === 2`).toBeTrue();
	});

	/**
	 * Value Embedding
	 *
	 * You can embed values in your expressions using `${}`.
	 */
	test('Value embedding', () => {
		expect(o`2 + ${3}` === 5).toBeTrue();
		expect(o`3 * 'ha'` === 'hahaha').toBeTrue();
		expect(o`${{ name: 'Steve' }}.name` === 'Steve').toBeTrue();
	});

	/**
	 * JS-like Property Access
	 */
	test('Property access', () => {
		const obj = { a: { b: { c: 123 } } };
		expect(o`${obj}.a.b.c` === 123).toBeTrue();
	});
});

/**
 * Bindings
 *
 * You can bind values to identifiers that can be used in expressions.
 * This is useful for working with variables in your expressions.
 *
 * Bindings are stored in the `Rop` instance. You can use the default instance `Rop.INST` or create your own instance to add bindings.
 */
describe('Quick Tutorial: Bindings', () => {
	test('Bind value to identifier on a custom Rop instance', () => {
		// Create a new Rop instance
		const rop = new Rop();

		// Bind values
		rop.bind('a', 10).bind('b', 5);
		expect(rop.o`a + b` === 15).toBeTrue();

		// Bind multiple values at once
		rop.bind({ x: 20, y: 30 });
		expect(rop.o`x * y` === 600).toBeTrue();
	});
	test('Bind value to identifier on the default Rop instance', () => {
		// Add bindings to the default instance
		Rop.INST.bind({ name: 'rop' });
		expect(o`"Hello, " + name` === 'Hello, rop').toBeTrue();
	});

	/**
	 * The default instance `Rop.INST` provides some default bindings.
	 *
	 * Including:
	 * - Some JS keywords like `true`, `false`, `null`, `undefined`, `NaN`, `Infinity`
	 * - Some JS global objects like `Object`, `Math`, `Date`, `JSON`
	 * - All methods in the `Math` object.
	 */
	test('Default bindings', () => {
		// Reset the default instance to ensure a clean state
		Rop.resetDefaultInstance();

		expect(o`true`).toBeTrue();
		expect(o`false`).toBeFalse();
		expect(o`null`).toBeNull();
		expect(o`undefined`).toBeUndefined();
		expect(o`NaN`).toBeNaN();
		expect(o`Infinity` === Infinity).toBeTrue();

		expect(o`sin(PI / 2)` === 1).toBeTrue();
	});

	/**
	 * The default instance `Rop.INST` provides some built-in operator overloadings.
	 */
	test('Default Instance: operator overloading', () => {
		// Array concatenation with +
		expect(o<number[]>`${[1, 2]} + ${[3, 4]}`).toEqual([1, 2, 3, 4]);

		// String repetition with *
		expect(o`'ha' * 3` === 'hahaha').toBeTrue();

		// Set union with `+`
		Rop.INST.bind({
			a: new Set([1, 2, 3]),
			b: new Set([3, 4, 5]),
		});
		expect(o<Set<number>>`a + b`).toEqual(new Set([1, 2, 3, 4, 5]));
	});
});

/**
 * Operation Overloading
 *
 * You can define custom operator behavior for classes. Supported operations include:
 * - JS Unary/Binary operators:
 *
 * The information about operation overloading can be stored in:
 * - `Rop` instance
 * - Object prototype
 */
describe('Quick Tutorial: Operation overloading', () => {
	/**
	 * Custom type operator overloading (on Class prototype)
	 */
	test('Add operation overloading on Class prototype', () => {
		class Vec2 {
			constructor(
				public x: number,
				public y: number,
			) {}

			// This is stored in the Class prototype. So it's avaialble in all Rop instance.
			[Rop.op('+')](this: Vec2, other: Vec2) {
				return new Vec2(this.x + other.x, this.y + other.y);
			}

			[Rop.op('*')](this: Vec2, other: Vec2) {
				return new Vec2(this.x * other.x, this.y * other.y);
			}
		}

		const a = new Vec2(2, 3);
		const b = new Vec2(4, 5);

		expect(o<Vec2>`${a} + ${b}`).toEqual(new Vec2(6, 8));

		// Any Rop instance can use this operator overloading.
		expect(new Rop().o<Vec2>`${a} * ${b}`).toEqual(new Vec2(8, 15));
	});

	/**
	 * Add operation overloading for an existing Class.
	 */
	test('Add operation overloading on Rop instance', () => {
		// Create a new Rop instance
		const rop = new Rop().bind({ true: true, false: false });
		// Here are 3 different styles to define the operation overloading function
		rop.overloads(Boolean, {
			// Method (Recommended style)
			'+'(this: boolean, other: boolean) {
				return this || other;
			},

			// Arrow function
			// the first parameter must be `self`
			'*': (self: boolean, other: boolean) => self && other,

			// Normal function
			// If you are using typescript, the first parameter must be `this`.
			// It's not a real parameter, it's just a type declaration for keyword `this`.
			'^': function (this: boolean, other: boolean) {
				return this !== other;
			},
		});
		expect(rop.o`true + false` === true).toBeTrue();
		expect(rop.o`true * false` === false).toBeTrue();
		expect(rop.o`true ^ false` === true).toBeTrue();
	});
});

/**
 * Array Slicing
 *
 * rop supports Python-style array slicing syntax.
 */
test('Python-style array slicing', () => {
	const rop = new Rop().overloadDefaults().bind({
		arr: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
	});

	// Basic slicing [start:end]
	expect(rop.o<number[]>`arr[2:5]`).toEqual([2, 3, 4]);

	// Slicing with step [start:end:step]
	expect(rop.o<number[]>`arr[1:8:2]`).toEqual([1, 3, 5, 7]);

	// Negative indices
	expect(rop.o<number[]>`arr[-3:-1]`).toEqual([7, 8]);

	// Reverse with step
	expect(rop.o<number[]>`arr[::-1]`).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);

	// Omitting start or end
	expect(rop.o<number[]>`arr[:3]`).toEqual([0, 1, 2]);
	expect(rop.o<number[]>`arr[7:]`).toEqual([7, 8, 9]);
});

/**
 * Working with Functions
 *
 * You can call functions in expressions, including built-in functions
 * and custom functions.
 */
test('Function calls', () => {
	const rop = new Rop().bind({
		add: (a: number, b: number) => a + b,
		sum(...args: number[]) {
			return args.reduce((acc, cur) => acc + cur, 0);
		},
	});

	expect(rop.o`add(5, 3)` === 8).toBeTrue();
	expect(rop.o`sum(1, 2, 3, add(4, 5))` === 15).toBeTrue();
});

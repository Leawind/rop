import { describe, expect, test } from 'bun:test';
import { Rop } from '../src';

describe('Rop operation overloading for custom types', () => {
	const rop = new Rop();
	class Vec2 {
		constructor(
			public x: number,
			public y: number,
		) {}

		[Rop.op('~')]() {
			return new Vec2(~this.x, ~this.y);
		}

		[Rop.op('+')](other: Vec2) {
			return new Vec2(this.x + other.x, this.y + other.y);
		}
	}

	test('should be able to overload operations for custom types', () => {
		const v = new Vec2(2, 3);

		const v2 = rop.o<Vec2>`~${v}`;
		expect(v2).toEqual(new Vec2(~v.x, ~v.y));

		const v3 = rop.o<Vec2>`${v} + ${v2}`;
		expect(v3).toEqual(new Vec2(v.x + v2.x, v.y + v2.y));
	});

	test('should overload an existing type with `Rop#overload`', () => {
		const a = new Vec2(1, 2);
		const b = new Vec2(3, 4);

		rop.overload(Vec2, '==', (self: Vec2, other: Vec2) => self.x === other.x && self.y === other.y);
		expect(rop.o<Vec2>`${a} == ${b}`).toBeFalse();

		rop.overload(Vec2, '-', function (this: Vec2, other: Vec2) {
			return new Vec2(this.x - other.x, this.y - other.y);
		});
		expect(rop.o<Vec2>`${a} - ${b}`).toEqual(new Vec2(a.x - b.x, a.y - b.y));
	});

	test('should overload an existing type with `Rop.overloads`', () => {
		const a = new Vec2(2, 3);
		const b = new Vec2(5, 7);

		rop.overloads(Vec2, {
			// Method (Recommended style)
			'+'(this: Vec2, other: Vec2) {
				return new Vec2(this.x + other.x, this.y + other.y);
			},
			// Arrow function
			'==': (self: Vec2, other: Vec2) => {
				return self.x === other.x && self.y === other.y;
			},
			// Normal function
			'-': function (this: Vec2, other: Vec2) {
				return new Vec2(this.x - other.x, this.y - other.y);
			},
		});
		expect(rop.o<Vec2>`${a} + ${b}`).toEqual(new Vec2(a.x + b.x, a.y + b.y));
		expect(rop.o<Vec2>`${a} - ${b}`).toEqual(new Vec2(a.x - b.x, a.y - b.y));
		expect(rop.o<Vec2>`${a} == ${b}`).toBeFalse();
	});
});

import { describe, expect, test } from 'bun:test';

import { detectFunctionType, normalizeIndex } from '../../src/utils';

describe('Function Type', () => {
	test('test detect function type', () => {
		const obj = {
			a: function () {},
			b: () => {},
			c() {},
		};

		for (const f of [obj.a, obj.b, obj.c]) {
			f.toString = () => 'Hello world!';
		}

		expect(detectFunctionType(obj.a)).toBe('normal');
		expect(detectFunctionType(obj.b)).toBe('arrow');
		expect(detectFunctionType(obj.c)).toBe('method');
	});

	test('test detect function type for special characters', () => {
		const obj = {
			甲: function (_a: string = '():?,;[]{}中a1$-_=>{', ..._args: any[]) {},
			乙: (_a: any) => {},
			['丙'](_a: string = '():?,;[]{}中a1$-_=>{', ..._args: any[]) {},
		};

		for (const f of [obj.甲, obj.乙, obj.丙]) {
			f.toString = () => 'Hello world!';
		}

		expect(detectFunctionType(obj.甲)).toBe('normal');
		expect(detectFunctionType(obj.乙)).toBe('arrow');
		expect(detectFunctionType(obj.丙)).toBe('method');
	});
});

describe('normalizeIndex', () => {
	test('should normalize index', () => {
		expect(normalizeIndex(0, 10)).toBe(0);
		expect(normalizeIndex(-2, 10)).toBe(8);
		expect(normalizeIndex(-10, 10)).toBe(0);
		expect(normalizeIndex(10, 10)).toBe(10);
	});
});

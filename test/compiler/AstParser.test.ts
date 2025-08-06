import { describe, expect, test } from 'bun:test';
import { NodeType } from '../../src/compiler/AstNode';
import { TokenType } from '../../src/compiler/Token';
import { $ast } from '../test-utils.test';
import { AstFactory } from '../../src/compiler/ast-parser/AstFactory';

describe('Parse single operand', () => {
	test('should parse value', () => {
		expect($ast`${123}`).toEqual({
			type: NodeType.Value,
			token: { type: TokenType.Embedded, literal: '${}', value: 123 },
		});
	});

	test('should parse single number constant', () => {
		expect($ast`42`).toEqual(AstFactory.constValue('42', 42));
	});

	test('should parse single number in parentheses', () => {
		expect($ast`((((((3.14))))))`).toEqual(AstFactory.constValue('3.14', 3.14));
	});

	test('should parse single constant', () => {
		expect($ast`"hello"`).toEqual(AstFactory.constValue('"hello"', 'hello'));
	});

	test('should parse identifier', () => {
		expect($ast`variable`).toEqual(AstFactory.identifier('variable'));
	});
});

describe('Parse operators', () => {
	test('should parse unary operators', () => {
		expect($ast`!true`).toEqual(AstFactory.unary('!', AstFactory.identifier('true')));
		expect($ast`~314`).toEqual(AstFactory.unary('~', AstFactory.constValue('314', 314)));
		expect($ast`-5`).toEqual(AstFactory.unary('-x', AstFactory.constValue('5', 5)));
	});

	test('should parse repeated unary operators', () => {
		expect($ast`!!!true`).toEqual(AstFactory.unary('!', AstFactory.unary('!', AstFactory.unary('!', AstFactory.identifier('true')))));
		expect($ast`~~~314`).toEqual(AstFactory.unary('~', AstFactory.unary('~', AstFactory.unary('~', AstFactory.constValue('314', 314)))));
		expect($ast`---5`).toEqual(AstFactory.unary('-x', AstFactory.unary('-x', AstFactory.unary('-x', AstFactory.constValue('5', 5)))));
	});

	test('should parse binary operators', () => {
		expect($ast`1 + 2`).toEqual(AstFactory.binary(AstFactory.constValue('1', 1), '+', AstFactory.constValue('2', 2)));
	});

	test('should parse operator precedence', () => {
		expect($ast`1 + 2 * 3`).toEqual(
			AstFactory.binary(
				AstFactory.constValue('1', 1),
				'+',
				AstFactory.binary(AstFactory.constValue('2', 2), '*', AstFactory.constValue('3', 3)),
			),
		);
	});

	test('should parse mixed unary and binary operators', () => {
		expect($ast`-2 + -4`).toEqual(
			AstFactory.binary(AstFactory.unary('-x', AstFactory.constValue('2', 2)), '+', AstFactory.unary('-x', AstFactory.constValue('4', 4))),
		);
		expect($ast`- 2 / -4`).toEqual(
			AstFactory.unary('-x', AstFactory.binary(AstFactory.constValue('2', 2), '/', AstFactory.unary('-x', AstFactory.constValue('4', 4)))),
		);
	});

	test('should parse parentheses for grouping', () => {
		expect($ast`1 + (2 * 3)`).toEqual(
			AstFactory.binary(
				AstFactory.constValue('1', 1),
				'+',
				AstFactory.binary(AstFactory.constValue('2', 2), '*', AstFactory.constValue('3', 3)),
			),
		);
		expect($ast`((1 + 2)) * 3`).toEqual(
			AstFactory.binary(AstFactory.binary(AstFactory.constValue(1), '+', AstFactory.constValue(2)), '*', AstFactory.constValue(3)),
		);
	});

	test('should parse unary operator precedence', () => {
		expect($ast`-5 * 3`).toEqual(AstFactory.unary('-x', AstFactory.binary(AstFactory.constValue(5), '*', AstFactory.constValue(3))));
	});

	test('should parse right associative operator', () => {
		expect($ast`2 ** 3 ** 4`).toEqual(
			AstFactory.binary(AstFactory.constValue(2), '**', AstFactory.binary(AstFactory.constValue(3), '**', AstFactory.constValue(4))),
		);
	});
	test('should parse left associative operator', () => {
		expect($ast`2 * 3 * 4`).toEqual(
			AstFactory.binary(AstFactory.binary(AstFactory.constValue(2), '*', AstFactory.constValue(3)), '*', AstFactory.constValue(4)),
		);
	});
});

describe('Parse property access', () => {
	test('should parse property access', () => {
		expect($ast`obj.prop`).toEqual(AstFactory.accessProperty(AstFactory.identifier('obj'), 'prop'));
	});
	test('should parse chained property access', () => {
		expect($ast`a.b.c`).toEqual(AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.identifier('a'), 'b'), 'c'));
	});
	test('should parse chained property access', () => {
		expect($ast`a.b.c.d.e`).toEqual(
			AstFactory.accessProperty(
				AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.accessProperty(AstFactory.identifier('a'), 'b'), 'c'), 'd'),
				'e',
			),
		);
	});
	test('should parse property access of expression', () => {
		expect($ast`(${'hey'} + '345').prop`).toEqual(
			AstFactory.accessProperty(AstFactory.binary(AstFactory.embeddedValue('hey'), '+', AstFactory.constValue("'345'", '345')), 'prop'),
		);
	});
});

describe('Parse invocation', () => {
	test('should parse invocation with no argument', () => {
		expect($ast`sin()`).toEqual(AstFactory.invoke(AstFactory.identifier('sin'), []));
	});

	test('should parse invocation with single argument', () => {
		expect($ast`sin(3)`).toEqual(AstFactory.invoke(AstFactory.identifier('sin'), [AstFactory.constValue(3)]));
	});

	test('should parse invocation with many arguments', () => {
		expect($ast`max(3, 5, 2)`).toEqual(
			AstFactory.invoke(AstFactory.identifier('max'), [AstFactory.constValue(3), AstFactory.constValue(5), AstFactory.constValue(2)]),
		);
	});
	test('should parse nested invocation', () => {
		expect($ast`a(b(c()))`).toEqual(
			AstFactory.invoke(AstFactory.identifier('a'), [
				AstFactory.invoke(AstFactory.identifier('b'), [AstFactory.invoke(AstFactory.identifier('c'), [])]),
			]),
		);
	});

	test('should parse method invocation', () => {
		expect($ast`Math.max(3, 4)`).toEqual(
			AstFactory.invoke(AstFactory.accessProperty(AstFactory.identifier('Math'), 'max'), [AstFactory.constValue(3), AstFactory.constValue(4)]),
		);
	});
	test('should parse chained method invocation', () => {
		expect($ast`a().b().c()`).toEqual(
			AstFactory.invoke(
				AstFactory.accessProperty(
					AstFactory.invoke(AstFactory.accessProperty(AstFactory.invoke(AstFactory.identifier('a'), []), 'b'), []),
					'c',
				),
				[],
			),
		);
	});
});
describe('Parse array indexing', () => {
	test('should throw parsing empty []', () => {
		expect(() => $ast`arr[]`).toThrow();
	});
	test('should parse array index', () => {
		expect($ast`arr[0]`).toEqual(AstFactory.index(AstFactory.identifier('arr'), AstFactory.constValue(0)));
	});
	test('should parse array index [-a]', () => {
		expect($ast`arr[-5]`).toEqual(AstFactory.index(AstFactory.identifier('arr'), AstFactory.unary('-x', AstFactory.constValue(5))));
	});

	test('should parse nesting indexing', () => {
		expect($ast`a[b[c[d]]]`).toEqual(
			AstFactory.index(
				AstFactory.identifier('a'),
				AstFactory.index(AstFactory.identifier('b'), AstFactory.index(AstFactory.identifier('c'), AstFactory.identifier('d'))),
			),
		);
	});
});
describe('Parse array slicing', () => {
	test('should parse array index [:]', () => {
		expect($ast`arr[:]`).toEqual(AstFactory.slice(AstFactory.identifier('arr'), [{ start: undefined, end: undefined, step: undefined }]));
	});
	test('should parse array index [::]', () => {
		expect($ast`arr[::]`).toEqual(AstFactory.slice(AstFactory.identifier('arr'), [{ start: undefined, end: undefined, step: undefined }]));
	});

	test('should parse array index combinations with no colon', () => {
		expect($ast`arr[2, 3, 4]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{ start: AstFactory.constValue(2) },
				{ start: AstFactory.constValue(3) },
				{ start: AstFactory.constValue(4) },
			]),
		);
	});

	test('should parse array index combinations with 1 colon', () => {
		expect($ast`arr[:, 1:, :2, 3:4]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{},
				{ start: AstFactory.constValue(1) },
				{ end: AstFactory.constValue(2) },
				{ start: AstFactory.constValue(3), end: AstFactory.constValue(4) },
			]),
		);
	});

	test('should parse array index combinations with 2 colons', () => {
		expect($ast`arr[::, 2::, :3:, ::4, 5:6:, 7::8, :9:0, A:B:C]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{},
				{ start: AstFactory.constValue(2) },
				{ end: AstFactory.constValue(3) },
				{ step: AstFactory.constValue(4) },
				{ start: AstFactory.constValue(5), end: AstFactory.constValue(6) },
				{ start: AstFactory.constValue(7), step: AstFactory.constValue(8) },
				{ end: AstFactory.constValue(9), step: AstFactory.constValue(0) },
				{ start: AstFactory.identifier('A'), end: AstFactory.identifier('B'), step: AstFactory.identifier('C') },
			]),
		);
	});

	test('should parse array slice [a:b]', () => {
		expect($ast`arr[5:9]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{
					start: AstFactory.constValue(5),
					end: AstFactory.constValue(9),
				},
			]),
		);
	});
	test('should parse array slice [a:b:c]', () => {
		expect($ast`arr[9:3:2]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{
					start: AstFactory.constValue(9),
					end: AstFactory.constValue(3),
					step: AstFactory.constValue(2),
				},
			]),
		);
	});

	test('should parse array slice [a, b]', () => {
		expect($ast`arr[5, 6]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [{ start: AstFactory.constValue(5) }, { start: AstFactory.constValue(6) }]),
		);
	});
	test('should parse array slice [:, :]', () => {
		expect($ast`arr[:, :]`).toEqual(AstFactory.slice(AstFactory.identifier('arr'), [{}, {}]));
	});

	test('should parse array slice [::, ::-1]', () => {
		expect($ast`arr[::, ::-1]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [{}, { step: AstFactory.unary('-x', AstFactory.constValue(1)) }]),
		);
	});

	test('should parse nested array slicing', () => {
		expect($ast`arr[a[:] : b[:] , c[:]]`).toEqual(
			AstFactory.slice(AstFactory.identifier('arr'), [
				{
					start: AstFactory.slice(AstFactory.identifier('a'), [{}]),
					end: AstFactory.slice(AstFactory.identifier('b'), [{}]),
				},
				{ start: AstFactory.slice(AstFactory.identifier('c'), [{}]) },
			]),
		);
	});
});

describe('Parse complex expressions', () => {
	test('should parse complex expression 1', () => {
		expect($ast`1 + 2 * 3 - 4 / 5`).toEqual(
			AstFactory.binary(
				AstFactory.binary(AstFactory.constValue(1), '+', AstFactory.binary(AstFactory.constValue(2), '*', AstFactory.constValue(3))),
				'-',
				AstFactory.binary(AstFactory.constValue(4), '/', AstFactory.constValue(5)),
			),
		);
	});

	test('parse complex expression 2', () => {
		expect($ast`3 + (bob) * (x + 2) / sin(abs( -a ** 6)) - 'yes' `).toEqual(
			AstFactory.binary(
				AstFactory.binary(
					AstFactory.constValue(3),
					'+',
					AstFactory.binary(
						AstFactory.binary(
							AstFactory.identifier('bob'),
							'*',
							AstFactory.binary(AstFactory.identifier('x'), '+', AstFactory.constValue(2)),
						),
						'/',
						AstFactory.invoke(AstFactory.identifier('sin'), [
							AstFactory.invoke(AstFactory.identifier('abs'), [
								AstFactory.unary('-x', AstFactory.binary(AstFactory.identifier('a'), '**', AstFactory.constValue(6))),
							]),
						]),
					),
				),
				'-',
				AstFactory.constValue("'yes'", 'yes'),
			),
		);
	});
});

describe('Parse special cases', () => {
	test('should throw error parsing empty', () => {
		expect(() => $ast``).toThrow();
	});

	test('should throw error parsing incomplete expression', () => {
		expect(() => $ast`1 +`).toThrow();
	});
});

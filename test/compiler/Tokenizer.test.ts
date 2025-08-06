import { it, expect, test, describe } from 'bun:test';
import { Tokenizer } from '../../src/compiler/tokenizer/Tokenizer';
import { TokenizingError } from '../../src/error';
import { TokenFactory } from '../../src/compiler/tokenizer/TokenFactory';

describe('Tokenize single token', () => {
	test('should tokenize empty string', () => {
		expect(Tokenizer.tokenize``).toEqual([]);
	});

	test('should ignore whitespaces', () => {
		expect(Tokenizer.tokenize` `).toEqual([]);
		expect(Tokenizer.tokenize`	`).toEqual([]);
		expect(Tokenizer.tokenize(`\n`)).toEqual([]);
		expect(Tokenizer.tokenize(`\n   	\n	  \n`)).toEqual([]);
		expect(Tokenizer.tokenize`	 
			   
			   `).toEqual([]);
	});

	test('should tokenize single value', () => {
		expect(Tokenizer.tokenize`${2}`).toEqual([TokenFactory.embeddedValue(2)]);
		expect(Tokenizer.tokenize`${'hello'}`).toEqual([TokenFactory.embeddedValue('hello')]);
	});

	test('should tokenize single constant: number', () => {
		expect(Tokenizer.tokenize`234`).toEqual([TokenFactory.constant('234', 234)]);
		expect(Tokenizer.tokenize`234.567`).toEqual([TokenFactory.constant('234.567', 234.567)]);
		expect(Tokenizer.tokenize`1e-4`).toEqual([TokenFactory.constant('1e-4', 1e-4)]);
		expect(Tokenizer.tokenize`1E-4`).toEqual([TokenFactory.constant('1E-4', 1e-4)]);
		expect(Tokenizer.tokenize`31415.926e-4`).toEqual([TokenFactory.constant('31415.926e-4', 31415.926e-4)]);
		expect(Tokenizer.tokenize`0.31415e1`).toEqual([TokenFactory.constant('0.31415e1', 0.31415e1)]);
		expect(Tokenizer.tokenize`2998e+5`).toEqual([TokenFactory.constant('2998e+5', 2998e5)]);
		expect(Tokenizer.tokenize`3.14159265358979323846264338327`).toEqual([
			TokenFactory.constant('3.14159265358979323846264338327', 3.14159265358979323846264338327),
		]);
	});
	test('should tokenize single constant: bigint', () => {
		expect(Tokenizer.tokenize`123n`).toEqual([TokenFactory.constant('123n', 123n)]);
		expect(Tokenizer.tokenize`43252352354n`).toEqual([TokenFactory.constant('43252352354n', 43252352354n)]);
	});
	test('should tokenize single constant: string', () => {
		expect(Tokenizer.tokenize`'Hello world!'`).toEqual([TokenFactory.constant("'Hello world!'", 'Hello world!')]);
		expect(Tokenizer.tokenize`"I said 'yes'"`).toEqual([TokenFactory.constant(`"I said 'yes'"`, "I said 'yes'")]);
		expect(Tokenizer.tokenize`'I said "yes"'`).toEqual([TokenFactory.constant(`'I said "yes"'`, 'I said "yes"')]);
		expect(Tokenizer.tokenize`"I said \"yes\""`).toEqual([TokenFactory.constant(`"I said \\"yes\\""`, 'I said "yes"')]);
		expect(Tokenizer.tokenize`'I said \'yes\''`).toEqual([TokenFactory.constant(`'I said \\'yes\\''`, "I said 'yes'")]);

		expect(Tokenizer.tokenize`"I say 'yes', you say \"no\""`).toEqual([
			TokenFactory.constant(`"I say 'yes', you say \\"no\\""`, `I say 'yes', you say "no"`),
		]);
	});

	test('should tokenize single identity with ascii characters', () => {
		expect(Tokenizer.tokenize`boolean`).toEqual([TokenFactory.identifier('boolean')]);
		expect(Tokenizer.tokenize`true`).toEqual([TokenFactory.identifier('true')]);
		expect(Tokenizer.tokenize`false`).toEqual([TokenFactory.identifier('false')]);
		expect(Tokenizer.tokenize`Infinity`).toEqual([TokenFactory.identifier('Infinity')]);
		expect(Tokenizer.tokenize`myVar`).toEqual([TokenFactory.identifier('myVar')]);
		expect(Tokenizer.tokenize`customName`).toEqual([TokenFactory.identifier('customName')]);
	});

	test('should tokenize single identity with special characters', () => {
		expect(Tokenizer.tokenize`hello`).toEqual([TokenFactory.identifier('hello')]);
		expect(Tokenizer.tokenize`你好`).toEqual([TokenFactory.identifier('你好')]);
		expect(Tokenizer.tokenize`\u4F60\u597D`).toEqual([TokenFactory.identifier('你好')]);
		expect(Tokenizer.tokenize`Γειά`).toEqual([TokenFactory.identifier('Γειά')]);
		expect(Tokenizer.tokenize`مرحبًا`).toEqual([TokenFactory.identifier('مرحبًا')]);
		expect(Tokenizer.tokenize`Привет`).toEqual([TokenFactory.identifier('Привет')]);
		expect(Tokenizer.tokenize`こんにちは`).toEqual([TokenFactory.identifier('こんにちは')]);
		expect(Tokenizer.tokenize`안녕하세요`).toEqual([TokenFactory.identifier('안녕하세요')]);
		expect(Tokenizer.tokenize`שלום`).toEqual([TokenFactory.identifier('שלום')]);

		expect(Tokenizer.tokenize`$_mixed_混合_123`).toEqual([TokenFactory.identifier('$_mixed_混合_123')]);
	});

	test('should tokenize single operator', () => {
		expect(Tokenizer.tokenize`~`).toEqual([TokenFactory.operator('~')]);
		expect(Tokenizer.tokenize`!`).toEqual([TokenFactory.operator('!')]);

		expect(Tokenizer.tokenize`+`).toEqual([TokenFactory.operator('+')]);
		expect(Tokenizer.tokenize`-`).toEqual([TokenFactory.operator('-')]);
		expect(Tokenizer.tokenize`*`).toEqual([TokenFactory.operator('*')]);
		expect(Tokenizer.tokenize`/`).toEqual([TokenFactory.operator('/')]);
		expect(Tokenizer.tokenize`%`).toEqual([TokenFactory.operator('%')]);
		expect(Tokenizer.tokenize`**`).toEqual([TokenFactory.operator('**')]);
		expect(Tokenizer.tokenize`<<`).toEqual([TokenFactory.operator('<<')]);
		expect(Tokenizer.tokenize`>>`).toEqual([TokenFactory.operator('>>')]);
		expect(Tokenizer.tokenize`>>>`).toEqual([TokenFactory.operator('>>>')]);
		expect(Tokenizer.tokenize`&`).toEqual([TokenFactory.operator('&')]);
		expect(Tokenizer.tokenize`|`).toEqual([TokenFactory.operator('|')]);
		expect(Tokenizer.tokenize`^`).toEqual([TokenFactory.operator('^')]);
		expect(Tokenizer.tokenize`&&`).toEqual([TokenFactory.operator('&&')]);
		expect(Tokenizer.tokenize`||`).toEqual([TokenFactory.operator('||')]);
		expect(Tokenizer.tokenize`==`).toEqual([TokenFactory.operator('==')]);
		expect(Tokenizer.tokenize`===`).toEqual([TokenFactory.operator('===')]);
		expect(Tokenizer.tokenize`!=`).toEqual([TokenFactory.operator('!=')]);
		expect(Tokenizer.tokenize`!==`).toEqual([TokenFactory.operator('!==')]);
		expect(Tokenizer.tokenize`>`).toEqual([TokenFactory.operator('>')]);
		expect(Tokenizer.tokenize`<`).toEqual([TokenFactory.operator('<')]);
		expect(Tokenizer.tokenize`>=`).toEqual([TokenFactory.operator('>=')]);
		expect(Tokenizer.tokenize`<=`).toEqual([TokenFactory.operator('<=')]);
	});

	test('should tokenize single grouper', () => {
		expect(Tokenizer.tokenize`(`).toEqual([TokenFactory.punctuation('(')]);
		expect(Tokenizer.tokenize`)`).toEqual([TokenFactory.punctuation(')')]);
		expect(Tokenizer.tokenize`[`).toEqual([TokenFactory.punctuation('[')]);
		expect(Tokenizer.tokenize`]`).toEqual([TokenFactory.punctuation(']')]);
		expect(Tokenizer.tokenize`{`).toEqual([TokenFactory.punctuation('{')]);
		expect(Tokenizer.tokenize`}`).toEqual([TokenFactory.punctuation('}')]);
	});
});

describe('Tokenize expression', () => {
	test('should tokenize value operation', () => {
		expect(Tokenizer.tokenize`${2} ** (${6} + ${2})`).toEqual([
			TokenFactory.embeddedValue(2),
			TokenFactory.operator('**'),
			TokenFactory.punctuation('('),
			TokenFactory.embeddedValue(6),
			TokenFactory.operator('+'),
			TokenFactory.embeddedValue(2),
			TokenFactory.punctuation(')'),
		]);
	});

	test('should tokenize value, number and bigint', () => {
		expect(Tokenizer.tokenize`${123} + 456 * 32n`).toEqual([
			TokenFactory.embeddedValue(123),
			TokenFactory.operator('+'),
			TokenFactory.constant('456', 456),
			TokenFactory.operator('*'),
			TokenFactory.constant('32n', 32n),
		]);
	});

	test('should tokenize strings', () => {
		expect(Tokenizer.tokenize`'hey' + "wow"`).toEqual([
			TokenFactory.constant("'hey'", 'hey'),
			TokenFactory.operator('+'),
			TokenFactory.constant('"wow"', 'wow'),
		]);
	});

	test('should tokenize identifiers', () => {
		expect(Tokenizer.tokenize`true + customName`).toEqual([
			TokenFactory.identifier('true'),
			TokenFactory.operator('+'),
			TokenFactory.identifier('customName'),
		]);
	});

	test('should tokenize groupers', () => {
		expect(Tokenizer.tokenize`2 * (7 + 4)`).toEqual([
			TokenFactory.constant('2', 2),
			TokenFactory.operator('*'),
			TokenFactory.punctuation('('),
			TokenFactory.constant('7', 7),
			TokenFactory.operator('+'),
			TokenFactory.constant('4', 4),
			TokenFactory.punctuation(')'),
		]);
	});

	test('should tokenize function call', () => {
		expect(Tokenizer.tokenize`cos(3)`).toEqual([
			TokenFactory.identifier('cos'),
			TokenFactory.punctuation('('),
			TokenFactory.constant('3', 3),
			TokenFactory.punctuation(')'),
		]);
	});
	test('should tokenize array indexing', () => {
		expect(Tokenizer.tokenize`arr[3]`).toEqual([
			TokenFactory.identifier('arr'),
			TokenFactory.punctuation('['),
			TokenFactory.constant('3', 3),
			TokenFactory.punctuation(']'),
		]);
	});
	test('should tokenize array slicing', () => {
		expect(Tokenizer.tokenize`arr[4:5]`).toEqual([
			TokenFactory.identifier('arr'),
			TokenFactory.punctuation('['),
			TokenFactory.constant('4', 4),
			TokenFactory.punctuation(':'),
			TokenFactory.constant('5', 5),
			TokenFactory.punctuation(']'),
		]);

		expect(Tokenizer.tokenize`tensor[3:4, 5:6:-1]`).toEqual([
			TokenFactory.identifier('tensor'),
			TokenFactory.punctuation('['),
			TokenFactory.constant('3', 3),
			TokenFactory.punctuation(':'),
			TokenFactory.constant('4', 4),
			TokenFactory.punctuation(','),
			TokenFactory.constant('5', 5),
			TokenFactory.punctuation(':'),
			TokenFactory.constant('6', 6),
			TokenFactory.punctuation(':'),
			TokenFactory.operator('-'),
			TokenFactory.constant('1', 1),
			TokenFactory.punctuation(']'),
		]);
	});

	test('should tokenize chained property access', () => {
		expect(Tokenizer.tokenize`Math.max.prototype`).toEqual([
			TokenFactory.identifier('Math'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('max'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('prototype'),
		]);
	});

	test('should tokenize chained method calls', () => {
		expect(Tokenizer.tokenize`a.b().c()`).toEqual([
			TokenFactory.identifier('a'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('b'),
			TokenFactory.punctuation('('),
			TokenFactory.punctuation(')'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('c'),
			TokenFactory.punctuation('('),
			TokenFactory.punctuation(')'),
		]);
	});

	test('should tokenize invocation with multiple arguments', () => {
		expect(Tokenizer.tokenize`max(3, 16n, 'hey')`).toEqual([
			TokenFactory.identifier('max'),
			TokenFactory.punctuation('('),
			TokenFactory.constant('3', 3),
			TokenFactory.punctuation(','),
			TokenFactory.constant('16n', 16n),
			TokenFactory.punctuation(','),
			TokenFactory.constant("'hey'", 'hey'),
			TokenFactory.punctuation(')'),
		]);
	});
});

describe('Tokenize complex expressions', () => {
	test('should tokenize complex expression 1', () => {
		expect(Tokenizer.tokenize`3 + (bob) * (x + 2) / sin(abs( -a ** 6)) - 'yes' `).toEqual([
			TokenFactory.constant('3', 3),
			TokenFactory.operator('+'),
			TokenFactory.punctuation('('),
			TokenFactory.identifier('bob'),
			TokenFactory.punctuation(')'),
			TokenFactory.operator('*'),
			TokenFactory.punctuation('('),
			TokenFactory.identifier('x'),
			TokenFactory.operator('+'),
			TokenFactory.constant('2', 2),
			TokenFactory.punctuation(')'),
			TokenFactory.operator('/'),
			TokenFactory.identifier('sin'),
			TokenFactory.punctuation('('),
			TokenFactory.identifier('abs'),
			TokenFactory.punctuation('('),
			TokenFactory.operator('-'),
			TokenFactory.identifier('a'),
			TokenFactory.operator('**'),
			TokenFactory.constant('6', 6),
			TokenFactory.punctuation(')'),
			TokenFactory.punctuation(')'),
			TokenFactory.operator('-'),
			TokenFactory.constant("'yes'", 'yes'),
		]);
	});
	test('should tokenize complex expression 2', () => {
		expect(Tokenizer.tokenize`abc().方法((34))(9.3) + 'abc'.qwer`).toEqual([
			TokenFactory.identifier('abc'),
			TokenFactory.punctuation('('),
			TokenFactory.punctuation(')'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('方法'),
			TokenFactory.punctuation('('),
			TokenFactory.punctuation('('),
			TokenFactory.constant('34', 34),
			TokenFactory.punctuation(')'),
			TokenFactory.punctuation(')'),
			TokenFactory.punctuation('('),
			TokenFactory.constant('9.3', 9.3),
			TokenFactory.punctuation(')'),
			TokenFactory.operator('+'),
			TokenFactory.constant("'abc'", 'abc'),
			TokenFactory.punctuation('.'),
			TokenFactory.identifier('qwer'),
		]);
	});
});

describe('Tokenize unexpected character', () => {
	it('should throw an error', () => {
		expect(() => {
			Tokenizer.tokenize`3 + 🌍`;
		}).toThrowError(TokenizingError);
	});
});

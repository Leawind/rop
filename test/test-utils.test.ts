import { expect, test, describe } from 'bun:test';
import { AstNode } from '../src/compiler/AstNode';
import { Tokenizer } from '../src/compiler/tokenizer/Tokenizer';
import { AstParser } from '../src/compiler/ast-parser/AstParser';
import { Rop } from '../src/Rop';

export function $raw(strings: TemplateStringsArray, ...args: unknown[]) {
	let result = '';
	const raw = strings.raw;
	for (let i = 0; i < strings.length; i++) {
		result += Tokenizer.parseUnicodeEscapes(raw[i]);
		if (i < args.length) {
			result += args[i];
		}
	}
	return result;
}

export function $ast(strs: TemplateStringsArray, ...args: unknown[]): AstNode {
	const tokens = Tokenizer.tokenize(strs, ...args);
	const ast = new AstParser(tokens).parse();
	return ast;
}

export function $eval(strs: TemplateStringsArray, ...args: unknown[]): any {
	return Rop.INST.o(strs, ...args);
}

describe('Test utils', () => {
	test('r tag', () => {
		expect($raw``).toBe('');

		expect($raw`abc`).toBe('abc');
		expect($raw`abc${1}`).toBe('abc1');
		expect($raw`abc${1}def`).toBe('abc1def');
		expect($raw`abc${1}def${2}`).toBe('abc1def2');
		expect($raw`${1}def${2}ghi`).toBe('1def2ghi');

		expect($raw`你好`).toBe('你好');

		expect($raw`\n`).toBe('\\n');
		expect($raw`"\""`).toBe('"\\""');
	});
});

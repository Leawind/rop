import { describe, expect, test } from 'bun:test';
import { TokenWalker } from '../../src/utils/TokenWalker';
import { TokenType, Token } from '../../src/compiler/Token';
import { TokenFactory } from '../../src/compiler/tokenizer/TokenFactory';

describe('TokenWalker', () => {
	const testTokens: Token[] = [
		TokenFactory.punctuation('('),
		TokenFactory.identifier('x'),
		TokenFactory.whitespace(' '),
		TokenFactory.operator('**'),
		TokenFactory.whitespace(' '),
		TokenFactory.constant('2', 2),
		TokenFactory.whitespace(' '),
		TokenFactory.operator('+'),
		TokenFactory.identifier('y'),
		TokenFactory.whitespace(' '),
		TokenFactory.operator('**'),
		TokenFactory.whitespace(' '),
		TokenFactory.constant('2', 2),
		TokenFactory.punctuation(')'),
	];

	test('TokenWalker basicctionality', () => {
		const tw = new TokenWalker(testTokens);

		expect(tw.getSource()).toEqual(testTokens);
		expect(tw.isFinished()).toBe(false);
		expect(tw.getCurrentPosition()).toBe(0);
		expect(tw.hasRemaining()).toBe(true);
	});

	test('TokenWalker peek', () => {
		const tw = new TokenWalker(testTokens);

		expect(tw.peek()).toEqual({ type: TokenType.Punctuation, literal: '(' });
		expect(tw.peek(1)).toEqual({ type: TokenType.Identifier, literal: 'x' });
		expect(tw.peek(0)).toEqual({ type: TokenType.Punctuation, literal: '(' });
		expect(tw.peek(100)).toBeNull();
		expect(tw.peek(-1)).toBeNull();
	});

	test('TokenWalker next', () => {
		const tw = new TokenWalker(testTokens);

		expect(tw.next()).toEqual({ type: TokenType.Punctuation, literal: '(' });
		expect(tw.getCurrentPosition()).toBe(1);

		expect(tw.next()).toEqual({ type: TokenType.Identifier, literal: 'x' });
		expect(tw.getCurrentPosition()).toBe(2);

		const nextThree = tw.next(3);
		expect(nextThree).toEqual([
			{ type: TokenType.Whitespace, literal: ' ' },
			{ type: TokenType.Operator, literal: '**' },
			{ type: TokenType.Whitespace, literal: ' ' },
		]);
		expect(tw.getCurrentPosition()).toBe(5);

		const walkerAtEnd = new TokenWalker([]);
		expect(walkerAtEnd.next()).toBeNull();
		expect(walkerAtEnd.next(1)).toBeNull();
	});

	test('TokenWalker skip', () => {
		const tw = new TokenWalker(testTokens);

		tw.skip();
		expect(tw.getCurrentPosition()).toBe(1);

		tw.skip(3);
		expect(tw.getCurrentPosition()).toBe(4);

		const walkerNearEnd = new TokenWalker([{ type: TokenType.Identifier, literal: 'x' }]);
		walkerNearEnd.skip(5);
		expect(walkerNearEnd.isFinished()).toBe(true);
	});

	test('TokenWalker getRemaining', () => {
		const tw = new TokenWalker(testTokens);
		tw.skip(2);

		const remaining = tw.getRemaining();
		expect(remaining.length).toBe(testTokens.length - 2);
		expect(remaining).toEqual(testTokens.slice(2));

		const walkerAtEnd = new TokenWalker(testTokens);
		walkerAtEnd.skip(testTokens.length);
		expect(walkerAtEnd.getRemaining()).toEqual([]);
		expect(walkerAtEnd.hasRemaining()).toBe(false);
	});
});

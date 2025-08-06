import { it, expect, test, describe } from 'bun:test';
import { CodeContext, TokenizingError } from '../src/error';

// test('CodeContext#render', () => {
// 	const src = `
// class RopSyntaxError extends Error {
// 	protected constructor(
// 		protected context: CodeContext,
// 		reason: string,
// 	) {
// 		super(context.render(reason));
// 	}
// }
// 	`;
// 	const ctx = new CodeContext(src, 64, 113);
// 	console.log(ctx.render('This is for test'));
// });

// describe('Error handling', () => {
// 	test('human readable error message', () => {
// 		Tokenizer.tokenize`
// 			1 + 2 + 3 +
// 		4 + 💧 + xyz
// 		+ 1234 + 5678
// 		`;
// 	});
// });

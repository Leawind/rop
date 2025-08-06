import { expect, test } from 'bun:test';
import { StringWalker } from '../../src/utils/StringWalker';

test('StringWalker', () => {
	const src = '(x ** 2 + y ** 2) ** 0.5';
	const sw = new StringWalker(src);

	expect(sw.getSource()).toBe(src);

	expect(sw.hasRemaining()).toBe(true);

	expect(sw.peek(3)).toBe('(x ');

	expect(sw.next('(')).toBe('(');
	expect(sw.next(/\w+/)![0]).toBe('x');

	sw.next(/\s*/);

	expect(sw.peek(2)).toBe('**');
	expect(sw.peek('**')).toBe('**');
	expect(sw.peek(/[^\w\s]+/)![0]).toBe('**');

	sw.next(/\s*/);

	expect(sw.next(/\d+/)![0]).toBe('2');

	sw.consume(sw.getRemaining().length);
	expect(sw.hasRemaining()).toBe(false);
});

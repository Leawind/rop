import type { Token } from '../compiler/Token';

/**
 * A utility class for walking through a sequence of tokens.
 *
 * This class provides methods for traversing a token array, peeking at tokens,
 * and consuming tokens.
 */
export class TokenWalker {
	protected position: number = 0;

	/**
	 * Create a new TokenWalker with the given tokens.
	 *
	 * @param tokens - The tokens to walk through
	 */
	public constructor(protected tokens: Token[]) {}

	/**
	 * Get the source tokens.
	 *
	 * @returns The source tokens array
	 */
	public getSource(): Token[] {
		return this.tokens;
	}

	/**
	 * Check if the walker has reached the end of the tokens.
	 *
	 * @returns True if the walker has reached the end, false otherwise
	 */
	public isFinished(): boolean {
		return this.position >= this.tokens.length;
	}

	/**
	 * Get the current position in the token array.
	 *
	 * @returns The current position
	 */
	public getCurrentPosition(): number {
		return this.position;
	}

	/**
	 * Check if there are remaining tokens.
	 *
	 * @returns True if there are remaining tokens, false otherwise
	 */
	public hasRemaining(): boolean {
		return this.position < this.tokens.length;
	}

	/**
	 * Get the remaining tokens.
	 *
	 * @returns An array of the remaining tokens
	 */
	public getRemaining(): Token[] {
		return this.tokens.slice(this.position);
	}

	/**
	 * Peek at a token at the current position or with an offset without consuming it.
	 *
	 * @param offset - The offset from the current position (default: 0)
	 * @returns The token at the specified position, or null if out of bounds
	 */
	public peek(offset?: number): Token | null;
	public peek(offset: number = 0): Token | null {
		const index = this.position + offset;
		if (index >= 0 && index < this.tokens.length) {
			return this.tokens[index] ?? null;
		}
		return null;
	}

	/**
	 * Get and consume the next token.
	 *
	 * @returns The next token, or null if no more tokens
	 */
	public next(): Token | null;

	/**
	 * Get and consume the next `count` tokens.
	 *
	 * @param count - The number of tokens to get
	 * @returns An array of the next `count` tokens, or null if no tokens
	 */
	public next(count: number): Token[] | null;
	public next(count?: number): Token | Token[] | null {
		if (count === undefined) {
			if (this.position < this.tokens.length) {
				return this.tokens[this.position++] ?? null;
			}
			return null;
		} else {
			const result: Token[] = [];
			for (let i = 0; i < count; i++) {
				if (this.position < this.tokens.length) {
					const token = this.tokens[this.position++];
					if (token !== undefined) {
						result.push(token);
					}
				} else {
					break;
				}
			}
			return result.length > 0 ? result : null;
		}
	}

	/**
	 * Consume tokens without returning them.
	 *
	 * @param count - The number of tokens to consume (default: 1)
	 */
	public consume(count: number = 1): void {
		this.position = Math.min(this.position + count, this.tokens.length);
	}

	/**
	 * Skip tokens (alias for consume).
	 *
	 * @param count - The number of tokens to skip (default: 1)
	 */
	public skip(count: number = 1): void {
		this.position = Math.min(this.position + count, this.tokens.length);
	}
}

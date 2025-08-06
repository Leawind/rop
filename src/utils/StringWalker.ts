/**
 * A utility class for walking through a string character by character.
 *
 * This class provides methods for traversing a string, peeking at characters,
 * and consuming portions of the string.
 */
export class StringWalker {
	protected position: number = 0;

	/**
	 * Create a new StringWalker with the given source string.
	 *
	 * @param source - The string to walk through
	 */
	public constructor(protected source: string) {}

	/**
	 * Get the source string.
	 *
	 * @returns The source string
	 */
	public getSource(): string {
		return this.source;
	}

	/**
	 * Check if the walker has reached the end of the string.
	 *
	 * @returns True if the walker has reached the end, false otherwise
	 */
	public isFinished(): boolean {
		return this.position >= this.source.length;
	}

	/**
	 * Check if there are remaining characters in the string.
	 *
	 * @returns True if there are remaining characters, false otherwise
	 */
	public hasRemaining(): boolean {
		return this.position < this.source.length;
	}

	/**
	 * Get the remaining portion of the string.
	 *
	 * @returns The remaining portion of the string
	 */
	public getRemaining(): string {
		return this.source.substring(this.position);
	}

	/**
	 * Peek at the next characters without consuming them.
	 *
	 * @param len - The number of characters to peek at
	 * @returns The next `len` characters
	 */
	public peek(len: number): string;

	/**
	 * Peek at the next characters to see if they match a string.
	 *
	 * @param by - The string to match against
	 * @returns The matching string if found, null otherwise
	 */
	public peek(by: string): string | null;

	/**
	 * Peek at the next characters to see if they match a regular expression.
	 *
	 * @param by - The regular expression to match against
	 * @returns The match result if found, null otherwise
	 */
	public peek(by: RegExp): RegExpMatchArray | null;
	public peek(by: number | string | RegExp): string | RegExpMatchArray | null {
		switch (typeof by) {
			case 'number': {
				return this.source.substring(this.position, this.position + by);
			}
			case 'string': {
				return this.peek(by.length) === by ? by : null;
			}
			case 'object': {
				return by instanceof RegExp ? this.getRemaining().match(by) : null;
			}
		}
	}

	/**
	 * Get the next characters and consume them.
	 *
	 * @param len - The number of characters to get
	 * @returns The next `len` characters
	 */
	public next(len: number): string;

	/**
	 * Get the next characters if they match a string and consume them.
	 *
	 * @param by - The string to match against
	 * @returns The matching string if found, null otherwise
	 */
	public next(by: string): string | null;

	/**
	 * Get the next characters if they match a regular expression and consume them.
	 *
	 * @param by - The regular expression to match against
	 * @returns The match result if found, null otherwise
	 */
	public next(by: RegExp): RegExpMatchArray | null;
	public next(by: number | string | RegExp): string | RegExpMatchArray | null {
		const result = this.peek(by as any) as string | RegExpMatchArray | null;

		if (typeof result === 'string') {
			this.position += result.length;
			return result;
		}

		if (Array.isArray(result)) {
			this.position += result[0].length;
			return result;
		}

		return null;
	}

	/**
	 * Consume characters without returning them.
	 *
	 * @param len - The number of characters to consume
	 */
	public consume(len: number): void;
	public consume(len: number) {
		this.position = Math.min(this.position + len, this.source.length);
	}
}

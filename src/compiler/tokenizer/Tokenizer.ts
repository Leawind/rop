import { TokenType, Token } from '../Token';
import { CodeContext, TokenizingError } from '../../error';
import { StringWalker } from '../../utils/StringWalker';
import { TokenFactory } from './TokenFactory';

/**
 * Tokenizer for converting strings into tokens.
 *
 * This class parses input strings or template literals into a sequence of tokens
 * that can be processed by the AstParser.
 */
export class Tokenizer extends StringWalker {
	/**
	 * Create a new tokenizer with the given input string.
	 *
	 * @param input - The input string to tokenize
	 * @param ignoreWhitespace - Whether to ignore whitespace tokens (default: true)
	 */
	private constructor(
		input: string,
		public ignoreWhitespace: boolean = true,
	) {
		super(input);
	}

	private tokenize(): Token[] {
		this.source = Tokenizer.parseUnicodeEscapes(this.source);
		const tokens: Token[] = [];

		while (this.hasRemaining()) {
			// Whitespace
			{
				const m = this.next(/^(\s|\n)+/);
				if (m !== null) {
					if (!this.ignoreWhitespace) {
						tokens.push({ type: TokenType.Whitespace, literal: m[0] });
					}
					continue;
				}
			}

			// Check for groupers and punctuations
			{
				const ch = this.peek(1);
				switch (ch) {
					case '(':
					case ')':
					case '[':
					case ']':
					case '{':
					case '}':
					case ',':
					case ':':
					case '.':
						tokens.push(TokenFactory.punctuation(ch));
						this.consume(1);
						continue;
				}
			}

			// Check for operators
			{
				const m = this.next(/^(<=|>=|===|!==|==|!=|\*\*|>>>|>>|<<|&&|\|\||[+\-*/%&|^<>!~])/);
				if (m) {
					tokens.push(TokenFactory.operator(m[0]));
					continue;
				}
			}

			// Check for Constants
			{
				// Number or BigInt literals
				{
					const m = this.next(/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?[n]?/);
					if (m) {
						const literal = m[0];
						let value: number | bigint = 0;

						if (literal.endsWith('n')) {
							// BigInt
							value = BigInt(literal.slice(0, -1));
						} else if (literal.includes('.') || literal.includes('e') || literal.includes('E')) {
							// Float or exponential notation
							value = parseFloat(literal);
						} else {
							// Integer
							value = parseInt(literal, 10);
						}

						tokens.push(TokenFactory.constant(literal, value));
						continue;
					}
				}

				// String literals (single quotes)
				{
					const m = this.next(/^'([^'\\]|\\.)*'/);
					if (m) {
						const literal = m[0];
						// Process escaped characters
						const value = literal.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\');
						tokens.push(TokenFactory.constant(literal, value));
						continue;
					}
				}

				// String literals (double quotes)
				{
					const m = this.next(/^"([^"\\]|\\.)*"/);
					if (m) {
						const literal = m[0];
						// Process escaped characters
						const value = literal.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
						tokens.push(TokenFactory.constant(literal, value));
						continue;
					}
				}
			}

			// Check for identifiers
			{
				const m = this.next(/^([$_\p{ID_Start}][$_\p{ID_Continue}]*)/u);
				if (m) {
					const literal = m[0];
					tokens.push(TokenFactory.identifier(literal));
					continue;
				}
			}

			// Can't match anything,
			const ctx = new CodeContext(this.source, this.position);
			const ch = this.peek(1);
			const hex = ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0');
			throw new TokenizingError(ctx, `Unexpected character '${ch}', code is \\u${hex}`);
		}

		return tokens;
	}

	/**
	 * Tokenize a string into tokens.
	 *
	 * @param str - The string to tokenize
	 * @returns An array of tokens
	 */
	public static tokenize(str: string): Token[];

	/**
	 * Tokenize a template literal into tokens.
	 *
	 * @param strs - The template strings
	 * @param args - The interpolated values
	 * @returns An array of tokens
	 *
	 * ### Example
	 * ```ts
	 * const tokens = Tokenizer.tokenize`a + ${b}`(strs, a);
	 * ```
	 */
	public static tokenize(strs: TemplateStringsArray, ...args: unknown[]): Token[];

	public static tokenize(s: string | TemplateStringsArray, ...args: unknown[]): Token[] {
		if (typeof s === 'string') {
			return new Tokenizer(s).tokenize();
		} else {
			let tokens: Token[] = [];
			for (let i = 0; i < args.length; i++) {
				tokens.push(...new Tokenizer(s.raw[i]).tokenize());
				tokens.push(TokenFactory.interpolation(args[i]));
			}
			tokens.push(...this.tokenize(s.raw.at(-1)!));
			return tokens;
		}
	}

	/**
	 * Parse Unicode escape sequences in a string.
	 *
	 * Supports both `\uXXXX` and `\u{XXXX}` formats.
	 *
	 * @param str - The string to parse
	 * @returns The string with Unicode escapes replaced
	 */
	public static parseUnicodeEscapes(str: string): string {
		return str
			.replace(/\\u([0-9A-Fa-f]{4,})/g, (_, hex) => {
				return String.fromCodePoint(parseInt(hex, 16));
			})
			.replace(/\\u\{([0-9A-Fa-f]{4,})\}/g, (_, hex) => {
				return String.fromCodePoint(parseInt(hex, 16));
			});
	}
}

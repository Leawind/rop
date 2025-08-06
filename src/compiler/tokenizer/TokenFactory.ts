import {
	EmbeddedToken,
	TokenType,
	WhitespaceToken,
	OperatorToken,
	ConstantToken,
	PunctuationToken,
	IdentifierToken,
	RopPunctuation as PunctuationChar,
} from '../Token';

/**
 * Factory class for creating tokens.
 *
 * This class provides static methods to create various types of tokens
 * used in the tokenization process.
 */
export class TokenFactory {
	private constructor() {}

	public static whitespace(literal: string): WhitespaceToken {
		return { type: TokenType.Whitespace, literal };
	}

	public static operator(literal: string): OperatorToken {
		return { type: TokenType.Operator, literal };
	}

	public static embeddedValue(value: unknown): EmbeddedToken {
		return { type: TokenType.Embedded, literal: '${}', value };
	}

	public static constant(literal: string, value: string | number | bigint): ConstantToken {
		return { type: TokenType.Constant, literal, value };
	}

	public static punctuation(literal: PunctuationChar): PunctuationToken {
		return { type: TokenType.Punctuation, literal };
	}

	public static identifier(literal: string): IdentifierToken {
		return { type: TokenType.Identifier, literal };
	}
}

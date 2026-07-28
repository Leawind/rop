import {
  ConstantToken,
  EmbeddedToken,
  IdentifierToken,
  OperatorToken,
  PunctuationToken,
  RopPunctuation as PunctuationChar,
  TokenType,
  WhitespaceToken,
} from '../Token.ts'
import { defineSpan, SourceSpan } from '../../source.ts'

/**
 * Factory class for creating tokens.
 *
 * This class provides static methods to create various types of tokens
 * used in the tokenization process.
 */
export class TokenFactory {
  private constructor() {}

  public static whitespace(literal: string, span?: SourceSpan): WhitespaceToken {
    return defineSpan({ type: TokenType.Whitespace, literal }, span ?? { start: 0, end: literal.length })
  }

  public static operator(literal: string, span?: SourceSpan): OperatorToken {
    return defineSpan({ type: TokenType.Operator, literal }, span ?? { start: 0, end: literal.length })
  }

  public static embeddedValue(value: unknown, span?: SourceSpan, index?: number): EmbeddedToken {
    const token = defineSpan({ type: TokenType.Embedded, literal: '${}' as const, value } as EmbeddedToken, span ?? { start: 0, end: 3 })
    if (index !== undefined) {
      Object.defineProperty(token, 'index', { enumerable: false, value: index })
    }
    return token
  }

  public static constant(literal: string, value: string | number | bigint, span?: SourceSpan): ConstantToken {
    return defineSpan({ type: TokenType.Constant, literal, value }, span ?? { start: 0, end: literal.length })
  }

  public static punctuation(literal: PunctuationChar, span?: SourceSpan): PunctuationToken {
    return defineSpan({ type: TokenType.Punctuation, literal }, span ?? { start: 0, end: literal.length })
  }

  public static identifier(literal: string, span?: SourceSpan): IdentifierToken {
    return defineSpan({ type: TokenType.Identifier, literal }, span ?? { start: 0, end: literal.length })
  }
}

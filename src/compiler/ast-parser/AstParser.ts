import { TokenWalker } from '../../utils/TokenWalker.ts'
import { PunctuationToken, Token, TokenType } from '../Token.ts'
import { AstNode, NodeSlice, NodeType } from '../AstNode.ts'
import { Operations } from '../Operators.ts'
import { ParsingError } from '../../error.ts'
import { defineSpan, mergeSpans, SourceSpan } from '../../source.ts'

/**
 * Parser for converting tokens into an Abstract Syntax Tree (AST).
 *
 * This class takes a sequence of tokens and builds an AST representation
 * that can be evaluated by the Evaluater.
 */
export class AstParser extends TokenWalker {
  /**
   * Create a new AST parser with the given tokens.
   *
   * @param tokens - The tokens to parse into an AST
   */
  public constructor(tokens: Token[], private readonly source: string = tokens.map((token) => token.literal).join('')) {
    super(tokens)
  }

  private error(reason: string, span: SourceSpan = this.peek()?.span ?? { start: this.source.length, end: this.source.length }): never {
    throw new ParsingError(this.source, span, reason)
  }

  /**
   * Parse the tokens into an AST.
   *
   * @returns The root node of the parsed AST
   * @throws {Error} If the expression is empty or there are unexpected tokens
   */
  public parse(): AstNode {
    // Preprocessing: skip all whitespace characters
    this.skipWhitespace()

    // If there are no tokens, throw an error
    if (this.isFinished()) {
      this.error('Empty expression')
    }

    // Parse expression
    const result = this.parseExpression()

    // Check if there are any unprocessed tokens
    this.skipWhitespace()
    if (!this.isFinished()) {
      const remaining = this.getRemaining()
      const t = '[\n' + remaining.map((x) => '\t' + JSON.stringify(x)).join(',\n') + '\n]'
      this.error(`Unexpected token at end of expression: \n${t}`, remaining[0]!.span)
    }

    return result
  }

  private skipWhitespace(): void {
    while (this.peek()?.type === TokenType.Whitespace) {
      this.skip()
    }
  }

  private parseExpression(precedence: number = 0): AstNode {
    // Parse left operand
    let left = this.parseAtom()

    // Continue parsing right operand and operator

    loop_parse_exp: while (true) {
      this.skipWhitespace()
      const token = this.peek()
      if (token === null) {
        // If there are no more tokens, end
        break loop_parse_exp
      }

      ////////////////////////////////////////////////////////////////
      // Parse binary operator
      ////////////////////////////////////////////////////////////////
      branch_token_type: switch (token.type) {
        case TokenType.Operator: {
          const operator = Operations.binaryFromLiteral(token.literal)
          if (operator === null) {
            this.error(`Unexpected operator '${token.literal}', binary operator expected`, token.span)
          }
          const meta = Operations.meta(operator)
          if (meta.type !== 'binary') {
            this.error('Invalid binary operator metadata', token.span)
          }

          if (meta.precedence < precedence) {
            break loop_parse_exp
          }
          this.consume()

          ////////////////////////////////////////////////////////////////
          // Parse right operand
          ////////////////////////////////////////////////////////////////

          // For right associative operators, use the same precedence (do not increase)
          // For left associative operators, use a higher precedence
          const isRightAssociative = operator === '**'
          const right = this.parseExpression(isRightAssociative ? meta.precedence : meta.precedence + 1)

          left = defineSpan({ type: NodeType.Binary, left, operation: operator, right }, mergeSpans(left, right))
          break branch_token_type
        }
        case TokenType.Punctuation: {
          switch (token.literal) {
            case '.': {
              this.consume()

              this.skipWhitespace()
              const prop = this.peek()
              if (prop !== null && prop.type === TokenType.Identifier) {
                left = defineSpan({ type: NodeType.AccessProperty, left, name: prop.literal }, { start: left.span.start, end: prop.span.end })
                this.consume()
                break branch_token_type
              }
              this.error('Expected identifier after dot')
            }
            case '(': {
              this.consume()

              const args: AstNode[] = []
              this.skipWhitespace()
              if (!this.tryConsumePunctuation(')')) {
                while (true) {
                  args.push(this.parseExpression())
                  this.skipWhitespace()

                  if (this.tryConsumePunctuation(')')) {
                    break
                  }
                  if (!this.tryConsumePunctuation(',')) {
                    this.error("Expected ',' or ')' after function argument")
                  }

                  this.skipWhitespace()
                  if (this.tryConsumePunctuation(')')) {
                    break // Allow a trailing comma.
                  }
                  if (this.peekPunctuation(',')) {
                    this.error('Expected expression after comma')
                  }
                }
              }

              const end = this.tokens[this.position - 1]!.span.end
              left = defineSpan({ type: NodeType.Invoke, target: left, args }, { start: left.span.start, end })

              break branch_token_type
            }
            case '[': {
              // Indexing or Slicing
              // [i] - Indexing
              // [a:b:c, d:e:f, ...] - Slicing
              this.consume()

              // Check for empty brackets []
              this.skipWhitespace()
              if (this.peekPunctuation(']')) {
                this.consume()
                this.error('Empty subscript is not allowed', token.span)
              }

              const slices: NodeSlice[] = []
              let isSlicing = false

              while (true) {
                const { slice, hasColon } = this.parseSliceDimension()
                slices.push(slice)
                isSlicing ||= hasColon

                this.skipWhitespace()
                if (this.tryConsumePunctuation(']')) {
                  break
                }
                if (!this.tryConsumePunctuation(',')) {
                  this.error("Expected ',' or ']' after subscript")
                }
                isSlicing = true

                this.skipWhitespace()
                if (this.tryConsumePunctuation(']')) {
                  break // Allow a trailing comma.
                }
                if (this.peekPunctuation(',')) {
                  this.error('Expected subscript after comma')
                }
              }

              // Determine if it's indexing or slicing
              if (isSlicing || slices.length > 1) {
                // Multiple slices or colons indicate slicing
                const end = this.tokens[this.position - 1]!.span.end
                left = defineSpan({ type: NodeType.Slicing, target: left, slices }, { start: left.span.start, end })
              } else if (slices.length === 1) {
                // Single slice - check if it's indexing or slicing
                const slice = slices[0]
                if (slice.start && slice.end === undefined && slice.step === undefined) {
                  // Simple index [expr]
                  const end = this.tokens[this.position - 1]!.span.end
                  left = defineSpan({ type: NodeType.Indexing, target: left, index: slice.start }, { start: left.span.start, end })
                } else {
                  // Complex slice with colons [start:end:step]
                  const end = this.tokens[this.position - 1]!.span.end
                  left = defineSpan({ type: NodeType.Slicing, target: left, slices }, { start: left.span.start, end })
                }
              }
              break branch_token_type
            }
          }
          break loop_parse_exp
        }
        default:
          break loop_parse_exp
      }
    }
    return left
  }

  private parseAtom(): AstNode {
    this.skipWhitespace()

    const token = this.next()
    if (token === null) {
      this.error('Unexpected end of expression')
    }

    switch (token.type) {
      case TokenType.Embedded:
      case TokenType.Constant:
        return defineSpan({ type: NodeType.Value, token }, token.span)
      case TokenType.Identifier:
        return defineSpan({ type: NodeType.Identifier, name: token.literal }, token.span)

      case TokenType.Operator: {
        // Handle unary operators
        const unaryOperatorName = Operations.unaryFromLiteral(token.literal)
        if (!unaryOperatorName) {
          this.error(`Unexpected operator: '${token.literal}'`, token.span)
        }
        const meta = Operations.meta(unaryOperatorName)
        if (meta.type !== 'unary') {
          this.error('Invalid unary operator metadata', token.span)
        }
        const operand = this.parseExpression(meta.precedence)
        return defineSpan({
          type: NodeType.Unary,
          operation: unaryOperatorName,
          operand,
        }, { start: token.span.start, end: operand.span.end })
      }

      case TokenType.Punctuation:
        if (token.literal === '(') {
          // Handle parentheses expressions
          const expr = this.parseExpression()

          this.skipWhitespace()
          if (this.tryConsumePunctuation(')') === null) {
            this.error('Expected closing parenthesis')
          }

          return expr
        }
        this.error(`Unexpected punctuation: ${token.literal}`, token.span)

      case TokenType.Whitespace:
        this.error(`Unexpected whitespace token: '${token.literal}'`, token.span)
      default:
        this.error(`Unknown token type: ${String(token)}`)
    }
  }

  private parseSliceDimension(): { slice: NodeSlice; hasColon: boolean } {
    this.skipWhitespace()
    const slice: NodeSlice = { start: undefined, end: undefined, step: undefined }

    if (!this.peekPunctuation(':') && !this.peekPunctuation(',') && !this.peekPunctuation(']')) {
      slice.start = this.parseExpression()
      this.skipWhitespace()
    }

    if (!this.tryConsumePunctuation(':')) {
      if (slice.start === undefined) {
        this.error('Expected subscript expression')
      }
      return { slice, hasColon: false }
    }

    this.skipWhitespace()
    if (!this.peekPunctuation(':') && !this.peekPunctuation(',') && !this.peekPunctuation(']')) {
      slice.end = this.parseExpression()
      this.skipWhitespace()
    }

    if (this.tryConsumePunctuation(':')) {
      this.skipWhitespace()
      if (!this.peekPunctuation(',') && !this.peekPunctuation(']')) {
        slice.step = this.parseExpression()
        this.skipWhitespace()
      }
    }

    if (this.peekPunctuation(':')) {
      this.error('A slice can contain at most two colons')
    }
    return { slice, hasColon: true }
  }

  private peekPunctuation(literal?: string): PunctuationToken | null {
    const p = this.peek()
    return p !== null && p.type === TokenType.Punctuation && (literal === undefined || p.literal === literal) ? p : null
  }

  private tryConsumePunctuation(punctuation: string): PunctuationToken | null {
    const p = this.peek()
    if (p !== null && p.type === TokenType.Punctuation && p.literal === punctuation) {
      return this.next() as PunctuationToken
    } else {
      return null
    }
  }
}

import { TokenWalker } from '../../utils/TokenWalker.ts'
import { PunctuationToken, Token, TokenType } from '../Token.ts'
import { AstNode, NodeSlice, NodeType } from '../AstNode.ts'
import { Operations } from '../Operators.ts'

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
  public constructor(tokens: Token[]) {
    super(tokens)
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
      throw new Error('Empty expression')
    }

    // Parse expression
    const result = this.parseExpression()

    // Check if there are any unprocessed tokens
    this.skipWhitespace()
    if (!this.isFinished()) {
      const remaining = this.getRemaining()
      const t = '[\n' + remaining.map((x) => '\t' + JSON.stringify(x)).join(',\n') + '\n]'
      throw new Error(`Unexpected token at end of expression: \n${t}`)
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
            throw new Error(`Unexpected token: ${token}, binary operator expected`)
          }
          const meta = Operations.meta(operator)
          if (meta.type !== 'binary') {
            throw new Error(`Never!`)
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

          left = { type: NodeType.Binary, left, operation: operator, right }
          break branch_token_type
        }
        case TokenType.Punctuation: {
          switch (token.literal) {
            case '.': {
              this.consume()

              this.skipWhitespace()
              const prop = this.peek()
              if (prop !== null && prop.type === TokenType.Identifier) {
                left = { type: NodeType.AccessProperty, left, name: prop.literal }
                this.consume()
                break branch_token_type
              }
              throw new Error('Expected identifier after dot')
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
                    throw new Error("Expected ',' or ')' after function argument")
                  }

                  this.skipWhitespace()
                  if (this.tryConsumePunctuation(')')) {
                    break // Allow a trailing comma.
                  }
                  if (this.peekPunctuation(',')) {
                    throw new Error('Expected expression after comma')
                  }
                }
              }

              left = { type: NodeType.Invoke, target: left, args }

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
                throw new Error('Empty subscript is not allowed')
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
                  throw new Error("Expected ',' or ']' after subscript")
                }
                isSlicing = true

                this.skipWhitespace()
                if (this.tryConsumePunctuation(']')) {
                  break // Allow a trailing comma.
                }
                if (this.peekPunctuation(',')) {
                  throw new Error('Expected subscript after comma')
                }
              }

              // Determine if it's indexing or slicing
              if (isSlicing || slices.length > 1) {
                // Multiple slices or colons indicate slicing
                left = { type: NodeType.Slicing, target: left, slices }
              } else if (slices.length === 1) {
                // Single slice - check if it's indexing or slicing
                const slice = slices[0]
                if (slice.start && slice.end === undefined && slice.step === undefined) {
                  // Simple index [expr]
                  left = { type: NodeType.Indexing, target: left, index: slice.start }
                } else {
                  // Complex slice with colons [start:end:step]
                  left = { type: NodeType.Slicing, target: left, slices }
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
      throw new Error('Unexpected end of expression')
    }

    switch (token.type) {
      case TokenType.Embedded:
      case TokenType.Constant:
        return { type: NodeType.Value, token }
      case TokenType.Identifier:
        return { type: NodeType.Identifier, name: token.literal }

      case TokenType.Operator: {
        // Handle unary operators
        const unaryOperatorName = Operations.unaryFromLiteral(token.literal)
        if (!unaryOperatorName) {
          throw new Error(`Unexpected operator: '${token.literal}'`)
        }
        const meta = Operations.meta(unaryOperatorName)
        if (meta.type !== 'unary') {
          throw new Error(`Never!`)
        }
        return {
          type: NodeType.Unary,
          operation: unaryOperatorName,
          operand: this.parseExpression(meta.precedence),
        }
      }

      case TokenType.Punctuation:
        if (token.literal === '(') {
          // Handle parentheses expressions
          const expr = this.parseExpression()

          this.skipWhitespace()
          if (this.tryConsumePunctuation(')') === null) {
            throw new Error('Expected closing parenthesis')
          }

          return expr
        }
        throw new Error(`Unexpected punctuation: ${token.literal}`)

      case TokenType.Whitespace:
        throw new Error(`Unexpected whitespace token: '${token.literal}'`)
      default:
        throw new Error(`Unknown token type: ${token}`)
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
        throw new Error('Expected subscript expression')
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
      throw new Error('A slice can contain at most two colons')
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

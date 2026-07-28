import { Token } from '../Token.ts'
import { TokenizingError } from '../../error.ts'
import { StringWalker } from '../../utils/StringWalker.ts'
import { TokenFactory } from './TokenFactory.ts'

export class Tokenizer extends StringWalker {
  private constructor(
    input: string,
    public ignoreWhitespace = true,
    private readonly offset = 0,
    private readonly fullSource: string = input,
  ) {
    super(input)
  }

  private span(start: number, end: number = this.position) {
    return { start: this.offset + start, end: this.offset + end }
  }

  private fail(start: number, reason: string, end: number = Math.max(start + 1, this.position)): never {
    throw new TokenizingError(this.fullSource, this.span(start, end), reason)
  }

  private tokenize(): Token[] {
    const tokens: Token[] = []

    while (this.hasRemaining()) {
      const start = this.position
      const whitespace = this.next(/^\s+/)
      if (whitespace) {
        if (!this.ignoreWhitespace) {
          tokens.push(TokenFactory.whitespace(whitespace[0], this.span(start)))
        }
        continue
      }

      const ch = this.peek(1)
      if ('()[]{},:'.includes(ch) || ch === '.' && !/\d/.test(this.peek(2).at(1) ?? '')) {
        this.consume(1)
        tokens.push(TokenFactory.punctuation(ch as Parameters<typeof TokenFactory.punctuation>[0], this.span(start)))
        continue
      }

      const operator = this.next(/^(<=|>=|===|!==|==|!=|\*\*|>>>|>>|<<|&&|\|\||[+\-*/%&|^<>!~])/)
      if (operator) {
        tokens.push(TokenFactory.operator(operator[0], this.span(start)))
        continue
      }

      if (/\d/.test(ch) || (ch === '.' && /\d/.test(this.peek(2).at(1) ?? ''))) {
        tokens.push(this.readNumber())
        continue
      }

      if (ch === "'" || ch === '"') {
        tokens.push(this.readString(ch))
        continue
      }

      const identifier = this.readIdentifier()
      if (identifier) {
        tokens.push(identifier)
        continue
      }

      const code = ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')
      this.fail(start, `Unexpected character '${ch}', code is \\u${code}`, start + ch.length)
    }

    return tokens
  }

  private readNumber(): Token {
    const start = this.position
    const remaining = this.getRemaining()
    const patterns = [
      /^0[xX][0-9a-fA-F](?:_?[0-9a-fA-F])*n?/,
      /^0[bB][01](?:_?[01])*n?/,
      /^0[oO][0-7](?:_?[0-7])*n?/,
      /^\d(?:_?\d)*n/,
      /^(?:\d(?:_?\d)*)?\.\d(?:_?\d)*(?:[eE][+-]?\d(?:_?\d)*)?/,
      /^\d(?:_?\d)*(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?/,
    ]
    const match = patterns.map((pattern) => remaining.match(pattern)?.[0]).find((literal) => literal !== undefined)
    if (!match) {
      this.fail(start, 'Invalid numeric literal')
    }
    this.consume(match.length)

    const next = this.peek(1)
    if (next === '.' || next === '\\' || /[$_\p{ID_Start}\p{ID_Continue}]/u.test(next)) {
      while (this.hasRemaining() && !/\s|[()[\]{},:+\-*/%&|^<>!~]/.test(this.peek(1))) {
        this.consume(1)
      }
      this.fail(start, 'Invalid numeric literal')
    }

    const normalized = match.replaceAll('_', '')
    const value = normalized.endsWith('n') ? BigInt(normalized.slice(0, -1)) : Number(normalized)
    return TokenFactory.constant(match, value, this.span(start))
  }

  private readString(quote: string): Token {
    const start = this.position
    this.consume(1)
    let value = ''

    while (this.hasRemaining()) {
      const ch = this.next(1)
      if (ch === quote) {
        const literal = this.source.slice(start, this.position)
        return TokenFactory.constant(literal, value, this.span(start))
      }
      if (ch === '\n' || ch === '\r') {
        this.fail(start, 'Unescaped newline in string literal')
      }
      if (ch !== '\\') {
        value += ch
        continue
      }
      if (!this.hasRemaining()) {
        this.fail(start, 'Unterminated string literal')
      }

      const escape = this.next(1)
      const simple: Record<string, string> = {
        "'": "'",
        '"': '"',
        '\\': '\\',
        b: '\b',
        f: '\f',
        n: '\n',
        r: '\r',
        t: '\t',
        v: '\v',
        0: '\0',
      }
      if (escape in simple) {
        if (escape === '0' && /\d/.test(this.peek(1))) {
          this.fail(start, 'Legacy octal escapes are not supported')
        }
        value += simple[escape]
      } else if (escape === 'x') {
        value += String.fromCodePoint(this.readHexEscape(start, 2, '\\x'))
      } else if (escape === 'u') {
        value += String.fromCodePoint(this.readUnicodeEscape(start))
      } else {
        this.fail(start, `Unsupported escape sequence \\${escape}`)
      }
    }
    this.fail(start, 'Unterminated string literal')
  }

  private readHexEscape(start: number, length: number, label: string): number {
    const hex = this.next(length)
    if (hex.length !== length || !new RegExp(`^[0-9a-fA-F]{${length}}$`).test(hex)) {
      this.fail(start, `Invalid ${label} escape`)
    }
    return Number.parseInt(hex, 16)
  }

  private readUnicodeEscape(start: number): number {
    let codePoint: number
    if (this.peek(1) === '{') {
      this.consume(1)
      const match = this.next(/^[0-9a-fA-F]{1,6}/)
      if (!match || this.next(1) !== '}') {
        this.fail(start, 'Invalid Unicode code point escape')
      }
      codePoint = Number.parseInt(match[0], 16)
    } else {
      codePoint = this.readHexEscape(start, 4, '\\u')
    }
    if (codePoint > 0x10FFFF || 0xD800 <= codePoint && codePoint <= 0xDFFF) {
      this.fail(start, 'Invalid Unicode code point')
    }
    return codePoint
  }

  private readIdentifier(): Token | null {
    const start = this.position
    let value = ''
    let first = true
    while (this.hasRemaining()) {
      let character: string
      const before = this.position
      if (this.peek(2) === '\\u') {
        this.consume(2)
        character = String.fromCodePoint(this.readUnicodeEscape(start))
      } else {
        character = this.next(1)
      }
      const valid = first ? /^[$_\p{ID_Start}]$/u.test(character) : /^[$_\u200C\u200D\p{ID_Continue}]$/u.test(character)
      if (!valid) {
        this.position = before
        break
      }
      value += character
      first = false
    }
    if (first) {
      this.position = start
      return null
    }
    return TokenFactory.identifier(value, this.span(start))
  }

  public static tokenize(str: string): Token[]
  public static tokenize(strs: TemplateStringsArray, ...args: unknown[]): Token[]
  public static tokenize(input: string | TemplateStringsArray, ...args: unknown[]): Token[] {
    if (typeof input === 'string') {
      return new Tokenizer(input).tokenize()
    }
    const tokens: Token[] = []
    const source = Tokenizer.source(input)
    let offset = 0
    for (let i = 0; i < args.length; i++) {
      const part = input.raw[i]
      tokens.push(...new Tokenizer(part, true, offset, source).tokenize())
      offset += part.length
      tokens.push(TokenFactory.embeddedValue(args[i], { start: offset, end: offset + 3 }))
      offset += 3
    }
    tokens.push(...new Tokenizer(input.raw.at(-1)!, true, offset, source).tokenize())
    return tokens
  }

  public static source(strings: TemplateStringsArray): string {
    return strings.raw.join('${}')
  }

  public static parseUnicodeEscapes(value: string): string {
    return value.replace(/\\u(?:\{([0-9a-fA-F]{1,6})\}|([0-9a-fA-F]{4}))/g, (literal, braced, fixed) => {
      const codePoint = Number.parseInt(braced ?? fixed, 16)
      if (codePoint > 0x10FFFF || 0xD800 <= codePoint && codePoint <= 0xDFFF) {
        throw new RangeError(`Invalid Unicode escape: ${literal}`)
      }
      return String.fromCodePoint(codePoint)
    })
  }
}

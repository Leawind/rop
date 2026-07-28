import { SourceSpan } from './source.ts'

export type RopErrorCode =
  | 'ROP_TOKENIZE'
  | 'ROP_PARSE'
  | 'ROP_REFERENCE'
  | 'ROP_TYPE'
  | 'ROP_EVALUATE'
  | 'ROP_INTERNAL'

export class CodeContext {
  public constructor(
    public readonly source: string,
    public readonly span: SourceSpan,
  ) {
    if (span.start < 0 || span.end < span.start || span.end > source.length) {
      throw new RangeError(`Invalid source span [${span.start}, ${span.end}) for source of length ${source.length}`)
    }
  }

  public toRowCol(index: number): [row: number, column: number] {
    const limit = Math.min(Math.max(index, 0), this.source.length)
    let row = 0
    let column = 0
    for (let i = 0; i < limit; i++) {
      if (this.source[i] === '\n') {
        row++
        column = 0
      } else {
        column++
      }
    }
    return [row, column]
  }

  public render(message = '', previousLineCount = 2, color = false): string {
    const [beginRow, beginColumn] = this.toRowCol(this.span.start)
    const [endRow, endColumn] = this.toRowCol(this.span.end)
    const lines = this.source.split('\n')
    const firstRow = Math.max(0, beginRow - previousLineCount)
    const lastRow = Math.min(lines.length - 1, endRow)
    const lineNumberWidth = String(lastRow + 1).length
    const red = color ? '\x1b[31m\x1b[1m' : ''
    const reset = color ? '\x1b[0m' : ''
    let result = ''

    for (let row = firstRow; row <= lastRow; row++) {
      const content = lines[row] ?? ''
      const prefix = `${String(row + 1).padStart(lineNumberWidth, ' ')} | `
      result += `${prefix}${content}\n`
      if (beginRow <= row && row <= endRow) {
        const left = row === beginRow ? beginColumn : 0
        const right = row === endRow ? endColumn : content.length
        const width = Math.max(1, right - left)
        const indentation = content.slice(0, left).replace(/[^\t]/g, ' ')
        result += `${' '.repeat(prefix.length)}${indentation}${red}${'^'.repeat(width)}${reset}\n`
      }
    }
    return message ? `${result}${red}${message}${reset}\n` : result
  }
}

export class RopError extends Error {
  public readonly context: CodeContext

  public constructor(
    message: string,
    public readonly code: RopErrorCode,
    public readonly source: string,
    public readonly span: SourceSpan,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = new.target.name
    this.context = new CodeContext(source, span)
  }

  public format(options: { color?: boolean; previousLineCount?: number } = {}): string {
    return `${this.name} [${this.code}]:\n${this.context.render(this.message, options.previousLineCount, options.color)}`
  }
}

export class TokenizingError extends RopError {
  public constructor(source: string, span: SourceSpan, reason: string) {
    super(reason, 'ROP_TOKENIZE', source, span)
  }
}

export class ParsingError extends RopError {
  public constructor(source: string, span: SourceSpan, reason: string) {
    super(reason, 'ROP_PARSE', source, span)
  }
}

export class RopReferenceError extends RopError {
  public constructor(source: string, span: SourceSpan, reason: string) {
    super(reason, 'ROP_REFERENCE', source, span)
  }
}

export class RopTypeError extends RopError {
  public constructor(source: string, span: SourceSpan, reason: string, options?: ErrorOptions) {
    super(reason, 'ROP_TYPE', source, span, options)
  }
}

export class RopEvaluationError extends RopError {
  public constructor(source: string, span: SourceSpan, reason: string, options?: ErrorOptions) {
    super(reason, 'ROP_EVALUATE', source, span, options)
  }
}

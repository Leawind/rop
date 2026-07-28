export interface SourceSpan {
  readonly start: number
  readonly end: number
}

export interface Spanned {
  readonly span: SourceSpan
}

export const EMPTY_SPAN: SourceSpan = Object.freeze({ start: 0, end: 0 })

export function defineSpan<T extends object>(value: T, span: SourceSpan = EMPTY_SPAN): T & Spanned {
  Object.defineProperty(value, 'span', {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Object.freeze({ ...span }),
  })
  return value as T & Spanned
}

export function mergeSpans(first: Spanned, last: Spanned): SourceSpan {
  return { start: first.span.start, end: last.span.end }
}

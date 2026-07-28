import { assertEquals, assertInstanceOf, assertStringIncludes } from '@std/assert'
import { ParsingError, RopReferenceError, TokenizingError } from '../src/error.ts'
import { Rop } from '../src/Rop.ts'
import { Tokenizer } from '../src/compiler/tokenizer/Tokenizer.ts'

Deno.test('structured errors include source locations', () => {
  try {
    Tokenizer.tokenize('first\n🌍')
    throw new Error('Expected tokenizing to fail')
  } catch (error) {
    assertInstanceOf(error, TokenizingError)
    assertEquals(error.context.toRowCol(error.span.start), [1, 0])
    assertStringIncludes(error.format(), '2 | 🌍')
  }

  const rop = new Rop()
  try {
    rop.o`1 + )`
    throw new Error('Expected parsing to fail')
  } catch (error) {
    assertInstanceOf(error, ParsingError)
    assertEquals(error.span, { start: 4, end: 5 })
  }

  try {
    rop.o`missing + 1`
    throw new Error('Expected evaluation to fail')
  } catch (error) {
    assertInstanceOf(error, RopReferenceError)
    assertEquals(error.span, { start: 0, end: 7 })
  }
})

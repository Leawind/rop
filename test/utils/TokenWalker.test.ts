import { assert, assertEquals, assertFalse, assertObjectMatch, assertStrictEquals } from '@std/assert'
import { TokenWalker } from '../../src/utils/TokenWalker.ts'
import { Token, TokenType } from '../../src/compiler/Token.ts'
import { TokenFactory } from '../../src/compiler/tokenizer/TokenFactory.ts'

Deno.test('TokenWalker', async (t) => {
  const testTokens: Token[] = [
    TokenFactory.punctuation('('),
    TokenFactory.identifier('x'),
    TokenFactory.whitespace(' '),
    TokenFactory.operator('**'),
    TokenFactory.whitespace(' '),
    TokenFactory.constant('2', 2),
    TokenFactory.whitespace(' '),
    TokenFactory.operator('+'),
    TokenFactory.identifier('y'),
    TokenFactory.whitespace(' '),
    TokenFactory.operator('**'),
    TokenFactory.whitespace(' '),
    TokenFactory.constant('2', 2),
    TokenFactory.punctuation(')'),
  ]

  await t.step('TokenWalker basicctionality', () => {
    const tw = new TokenWalker(testTokens)

    assertStrictEquals(tw.getSource(), testTokens)
    assertFalse(tw.isFinished())
    assertEquals(tw.getCurrentPosition(), 0)
    assert(tw.hasRemaining())
  })

  await t.step('TokenWalker peek', () => {
    const tw = new TokenWalker(testTokens)

    assertObjectMatch(tw.peek()!, { type: TokenType.Punctuation, literal: '(' })
    assertObjectMatch(tw.peek(1)!, { type: TokenType.Identifier, literal: 'x' })
    assertObjectMatch(tw.peek(0)!, { type: TokenType.Punctuation, literal: '(' })
    assertEquals(tw.peek(100), null)
    assertEquals(tw.peek(-1), null)
  })

  await t.step('TokenWalker next', () => {
    const tw = new TokenWalker(testTokens)

    assertObjectMatch(tw.next()!, { type: TokenType.Punctuation, literal: '(' })
    assertEquals(tw.getCurrentPosition(), 1)

    assertObjectMatch(tw.next()!, { type: TokenType.Identifier, literal: 'x' })
    assertEquals(tw.getCurrentPosition(), 2)

    const nextThree = tw.next(3)
    assertEquals(nextThree, [
      TokenFactory.whitespace(' '),
      TokenFactory.operator('**'),
      TokenFactory.whitespace(' '),
    ])
    assertEquals(tw.getCurrentPosition(), 5)

    const walkerAtEnd = new TokenWalker([])
    assertEquals(walkerAtEnd.next(), null)
    assertEquals(walkerAtEnd.next(1), null)
  })

  await t.step('TokenWalker skip', () => {
    const tw = new TokenWalker(testTokens)

    tw.skip()
    assertStrictEquals(tw.getCurrentPosition(), 1)

    tw.skip(3)
    assertStrictEquals(tw.getCurrentPosition(), 4)

    const walkerNearEnd = new TokenWalker([TokenFactory.identifier('x')])
    walkerNearEnd.skip(5)
    assert(walkerNearEnd.isFinished())
  })

  await t.step('TokenWalker getRemaining', () => {
    const tw = new TokenWalker(testTokens)
    tw.skip(2)

    const remaining = tw.getRemaining()
    assertEquals(remaining.length, testTokens.length - 2)
    assertEquals(remaining, testTokens.slice(2))

    const walkerAtEnd = new TokenWalker(testTokens)
    walkerAtEnd.skip(testTokens.length)
    assertEquals(walkerAtEnd.getRemaining(), [])
    assertFalse(walkerAtEnd.hasRemaining())
  })
})

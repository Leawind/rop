import { assert, assertFalse, assertStrictEquals } from '@std/assert'
import { StringWalker } from '../../src/utils/StringWalker.ts'

Deno.test('StringWalker', () => {
  const src = '(x ** 2 + y ** 2) ** 0.5'
  const sw = new StringWalker(src)

  assertStrictEquals(sw.getSource(), src)

  assert(sw.hasRemaining())

  assertStrictEquals(sw.peek(3), '(x ')

  assertStrictEquals(sw.next('('), '(')
  assertStrictEquals(sw.next(/\w+/)![0], 'x')

  sw.next(/\s*/)

  assertStrictEquals(sw.peek(2), '**')
  assertStrictEquals(sw.peek('**'), '**')
  assertStrictEquals(sw.peek(/[^\w\s]+/)![0], '**')

  sw.next(/\s*/)

  assertStrictEquals(sw.next(/\d+/)![0], '2')

  sw.consume(sw.getRemaining().length)
  assertFalse(sw.hasRemaining())
})

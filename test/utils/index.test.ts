import { assertStrictEquals } from '@std/assert'

import { normalizeIndex } from '../../src/utils/index.ts'

Deno.test('normalizeIndex', async (t) => {
  await t.step('should normalize index', () => {
    assertStrictEquals(normalizeIndex(0, 10), 0)
    assertStrictEquals(normalizeIndex(-2, 10), 8)
    assertStrictEquals(normalizeIndex(-10, 10), 0)
    assertStrictEquals(normalizeIndex(10, 10), 10)
  })
})

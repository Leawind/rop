import { assertEquals, assertThrows } from '@std/assert'
import { normalizeSlice, sliceArray } from '../../src/utils/slicing.ts'

Deno.test('slice normalization', () => {
  assertEquals(normalizeSlice(5, {}), { start: 0, end: 5, step: 1 })
  assertEquals(normalizeSlice(5, { step: -1 }), { start: 4, end: -1, step: -1 })
  assertEquals(normalizeSlice(5, { start: -99, end: 99 }), { start: 0, end: 5, step: 1 })
  assertEquals(sliceArray([1, 2, 3], { start: 99, end: -99, step: -1 }), [3, 2, 1])
  assertThrows(() => normalizeSlice(5, { step: 0 }), RangeError)
  assertThrows(() => normalizeSlice(5, { start: 1.5 }), TypeError)
})
